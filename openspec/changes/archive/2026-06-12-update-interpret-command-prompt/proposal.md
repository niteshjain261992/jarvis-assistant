## Why

The current `buildCommandSystemPrompt()` produces a compact single-line catalog summary. It lacks explicit parsing rules, per-command trigger phrases, few-shot examples, and a canonical `UNKNOWN:NONE` fallback — so the model still invents non-catalog commands (e.g. `OPEN:VIDEO_CAMERA`) for ambiguous requests. A structured command-parser prompt should improve deterministic routing while keeping the existing catalog-driven executor/payload lookup.

## What Changes

- Replace `buildCommandSystemPrompt()` in `src/config/command-catalog.ts` with the user-provided structured prompt (rules, allowed commands with triggers, examples, `UNKNOWN:NONE` fallback)
- Keep `COMMAND_CATALOG`, `ALLOWED_COMMANDS`, and `getCommandCatalogEntry()` unchanged for runtime executor/payload resolution
- Keep `interpretCommand` normalization and non-catalog passthrough behavior unchanged
- Update tests for `buildCommandSystemPrompt` and `interpretCommand` system-prompt assertions
- Sync `openspec/codebase/interfaces/ollama.md`

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `command-interpretation`: Ollama system instruction SHALL use structured parser rules, per-command triggers, examples, and `UNKNOWN:NONE` for non-matching requests

## Impact

- `src/config/command-catalog.ts` — `buildCommandSystemPrompt()`
- `tests/config/command-catalog.test.ts`
- `tests/services/ollama.service.test.ts`
- `openspec/codebase/interfaces/ollama.md`

No HTTP API shape changes. `COMMAND_CATALOG` entries and executor routing unchanged.
