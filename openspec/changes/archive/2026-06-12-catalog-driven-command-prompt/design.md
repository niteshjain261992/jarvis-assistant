## Context

`update-interpret-command-prompt` replaced the prompt with a verbatim multi-line string listing `OPEN:CAMERA`, `OFF:LIGHTS`, `PLAY:MUSIC` triggers and examples. `COMMAND_CATALOG` still drives runtime executor/payload lookup but trigger phrases in the catalog are a subset of what's in the prompt. This change makes the catalog the single source of truth for LLM-facing triggers and examples.

## Goals / Non-Goals

**Goals:**

- Generate allowed-command trigger lines from `COMMAND_CATALOG` (`command` + `phrases.join(', ')`)
- Generate one few-shot example per catalog entry (first phrase → command)
- Merge expanded trigger phrases into `COMMAND_CATALOG.phrases` (from current hardcoded prompt)
- Keep static sections: intro, rules, `UNKNOWN:NONE` trigger line, unknown examples, closing line
- Test that adding a catalog entry automatically appears in the prompt

**Non-Goals:**

- Adding `UNKNOWN:NONE` to `COMMAND_CATALOG` or `ALLOWED_COMMANDS`
- Changing `interpretCommand` or message pipeline behavior
- Auto-generating unknown-request examples from catalog

## Decisions

### 1. Source of truth: `COMMAND_CATALOG`, not `ALLOWED_COMMANDS`

**Choice:** Iterate `COMMAND_CATALOG` entries; `ALLOWED_COMMANDS` remains derived from catalog for validation only.

**Rationale:** Triggers live on catalog entries (`phrases`); `ALLOWED_COMMANDS` is a flat set with no phrase metadata.

### 2. Trigger line format

**Choice:** `${command.padEnd(16)}— ${phrases.join(', ')}` (or similar alignment) for each catalog entry, then static `UNKNOWN:NONE` line.

**Rationale:** Preserves readable prompt layout from current hardcoded version.

### 3. Example generation

**Choice:** For each catalog entry, emit `User: "${phrases[0]}" → ${command}` with padded spacing for readability.

**Rationale:** User asked for examples from catalog; first phrase is sufficient. Unknown examples stay static.

### 4. Expand catalog phrases

**Choice:** Update `phrases` arrays to include triggers currently only in hardcoded prompt:

- `OPEN:CAMERA`: add `take a photo`, `take a picture`
- `OFF:LIGHTS`: add `kill the lights`
- `PLAY:MUSIC`: add `play some songs`, `put on music`

**Rationale:** No phrase loss when removing hardcoded lines.

## Risks / Trade-offs

- **[Risk] Example quality varies by `phrases[0]`** → Acceptable; catalog maintainers order phrases with best example first.
- **[Risk] Prompt layout changes slightly** → Tests assert content presence, not exact whitespace.

## Migration Plan

Single deploy. Expand catalog phrases + refactor `buildCommandSystemPrompt()`. Rollback: restore hardcoded prompt.

## Open Questions

None.
