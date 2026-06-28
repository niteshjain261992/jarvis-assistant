## Context

`interpretCommand` sends a generic system prompt with three example mappings. Temperature is already 0, but the model still paraphrases targets (`VIDEO_CAMERA`, `VIDEOCAM`) because nothing forbids synonyms. The async message pipeline stores `data.command` for the mobile client to act on — inconsistent strings break client routing.

The user chose: **hardcode every event in the system prompt** for consistent results.

## Goals / Non-Goals

**Goals:**

- Every supported user intent maps to exactly one canonical `ACTION:TARGET` from a closed catalog.
- Catalog drives the system prompt (full list + phrase hints).
- Post-LLM check compares against `ALLOWED_COMMANDS` for observability only; non-catalog output is **passed through** as the normalized response string (no error).
- Easy to add new commands: one catalog entry + tests.

**Non-Goals:**

- Fuzzy matching or synonym normalization maps (e.g. auto-map `VIDEO_CAMERA` → `CAMERA`).
- New HTTP endpoints or client contract changes.
- Replacing Ollama with rule-based parsing (catalog informs the LLM, not bypasses it).
- Exhaustive smart-home coverage in v1 — seed with known commands; extend catalog as mobile features ship.

## Decisions

### 1. Command catalog module

New `src/config/command-catalog.ts`:

```ts
export interface CommandCatalogEntry {
  command: string;       // canonical ACTION:TARGET, e.g. OPEN:CAMERA
  phrases: readonly string[]; // example user phrases for the prompt
}

export const COMMAND_CATALOG: readonly CommandCatalogEntry[];
export const ALLOWED_COMMANDS: ReadonlySet<string>; // derived uppercase set
export function buildCommandSystemPrompt(): string;
```

**v1 seed catalog** (from existing examples + camera fix):

| Command | Example phrases |
|---------|-----------------|
| `OPEN:CAMERA` | open camera, show camera, turn on camera, start camera |
| `OFF:LIGHTS` | turn off lights, lights off, switch off lights |
| `PLAY:MUSIC` | play music, start music |

New mobile intents = new catalog row + prompt auto-updates.

### 2. System prompt structure

`buildCommandSystemPrompt()` emits:

1. Jarvis command-interpreter role (keep current persona line).
2. Rule: output MUST be exactly one command from the allowed list below — never invent targets or synonyms.
3. Full enumerated list: each line `COMMAND — triggered by phrases like "…", "…"`.
4. Rule: respond with ONLY the command string, uppercase, no extra text.

This replaces hand-maintained `COMMAND_SYSTEM_PROMPT` constant in `ollama.service.ts`.

### 3. Post-LLM handling

After `normalizeCommand`, if result ∈ `ALLOWED_COMMANDS`, return it. If result ∉ `ALLOWED_COMMANDS`, **return the same normalized string** (passthrough) — do not throw. Optionally log at debug level when passthrough occurs so drift is visible in logs.

Consistency is achieved primarily via the hardcoded catalog in the system prompt, not by rejecting unknown strings.

**Alternative considered:** Reject non-catalog output with `LLM_EMPTY_RESPONSE` — rejected per product choice; unknown commands should still reach the client.

### 4. Testing

- Unit test `buildCommandSystemPrompt()` includes every catalog command.
- `interpretCommand` test: mock LLM returning `OPEN:VIDEO_CAMERA` → passthrough as normalized string.
- Existing happy-path tests unchanged (`OPEN:CAMERA` still passes).

## Risks / Trade-offs

- [Prompt grows with catalog size] → Mitigation: catalog is small for v1; prompt still fits context window; split catalog module keeps maintainable.
- [LLM still picks wrong catalog entry or synonym] → Mitigation: phrase hints per entry; extend catalog as intents are added; passthrough preserves client visibility of drift.
- [Non-catalog passthrough may confuse client] → Mitigation: catalog prompt reduces drift; client can ignore unknown commands until catalog catches up.

## Migration Plan

Deploy backend only. Mobile client should already handle canonical strings; no client change required for seeded commands. Add catalog entries before shipping new mobile features.

## Open Questions

- Confirm full v1 command list with mobile team before apply (seed covers current examples; extend in same PR if list is known).
