## Context

`interpretCommand` calls `buildCommandSystemPrompt()` from `command-catalog.ts`. The current prompt joins a Jarvis role line with auto-generated catalog phrase hints. Runtime routing (`getCommandCatalogEntry`, executor, payload) stays in `COMMAND_CATALOG`; only the LLM-facing instructions change.

The user-provided prompt adds explicit rules, expanded trigger phrases, few-shot examples, and `UNKNOWN:NONE` as the canonical non-match output.

## Goals / Non-Goals

**Goals:**

- Replace `buildCommandSystemPrompt()` output with the user-provided structured prompt (verbatim content)
- Preserve `COMMAND_CATALOG`, `ALLOWED_COMMANDS`, `getCommandCatalogEntry`, and `interpretCommand` normalization/passthrough
- Update unit tests to assert new prompt structure (rules, triggers, examples, `UNKNOWN:NONE`)

**Non-Goals:**

- Adding `UNKNOWN:NONE` to `COMMAND_CATALOG` or `ALLOWED_COMMANDS` (passthrough + default client executor is sufficient for v1)
- Expanding `COMMAND_CATALOG.phrases` to match every trigger in the prompt (prompt is LLM-facing; catalog drives executor metadata)
- Changing action-branch HTTP response shape

## Decisions

### 1. Verbatim multi-line prompt in `buildCommandSystemPrompt()`

**Choice:** Return the user's prompt as a joined multi-line string from `buildCommandSystemPrompt()`. Remove `formatCatalogLine` / `COMMAND_ROLE` single-line assembly.

**Rationale:** User supplied exact wording, triggers, and examples; matches `INTENT_SYSTEM_PROMPT` pattern from `update-classify-intent-prompt`.

**Alternatives considered:**
- Generate triggers from `COMMAND_CATALOG` — loses user's expanded phrases and examples

### 2. Keep `UNKNOWN:NONE` out of `ALLOWED_COMMANDS`

**Choice:** Do not add `UNKNOWN:NONE` to the catalog set. `interpretCommand` returns it via existing passthrough; `message.service` uses `entry ?? { command }` defaults.

**Rationale:** Minimal diff; `UNKNOWN:NONE` is a parser output, not a client-executable device command.

### 3. Test updates

**Choice:** Update `command-catalog.test.ts` and `ollama.service.test.ts` to assert parser rules, triggers, examples, and catalog commands in `body.system`. Keep non-catalog passthrough test.

## Risks / Trade-offs

- **[Risk] Prompt and catalog drift** → Acceptable for v1; catalog changes should manually update prompt when commands are added.
- **[Risk] Model still invents commands despite rules** → Mitigated by examples and `UNKNOWN:NONE`; passthrough still handles edge cases.

## Migration Plan

Single deploy. No migration. Rollback: revert `buildCommandSystemPrompt()`.

## Open Questions

None.
