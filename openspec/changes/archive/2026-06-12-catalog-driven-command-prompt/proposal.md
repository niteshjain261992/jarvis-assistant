## Why

`buildCommandSystemPrompt()` currently hardcodes allowed commands, trigger phrases, and per-command examples as string literals. Adding or changing a command in `COMMAND_CATALOG` requires manually editing the prompt in two places, which already caused drift (e.g. expanded triggers like "take a photo" exist only in the prompt, not in catalog `phrases`). Generating the prompt from `COMMAND_CATALOG` keeps a single source of truth.

## What Changes

- Refactor `buildCommandSystemPrompt()` to build the "Allowed commands and their triggers" section from `COMMAND_CATALOG` entries (command + `phrases` joined)
- Generate per-command few-shot example lines from catalog data (e.g. first phrase → command mapping)
- Expand `COMMAND_CATALOG.phrases` to include all trigger phrases currently only in the hardcoded prompt
- Keep static prompt framing (rules, `UNKNOWN:NONE` fallback line, unknown-request examples, closing instruction)
- Update tests to assert prompt stays in sync when catalog changes

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `command-interpretation`: System instruction SHALL be derived from `COMMAND_CATALOG` at build time, not hardcoded command/trigger lines

## Impact

- `src/config/command-catalog.ts` — `COMMAND_CATALOG.phrases`, `buildCommandSystemPrompt()`
- `tests/config/command-catalog.test.ts` — catalog-driven prompt sync tests
- `tests/services/ollama.service.test.ts` — adjust assertions if example formatting changes
- `openspec/codebase/interfaces/ollama.md` — note catalog-driven prompt generation

No HTTP API changes. `ALLOWED_COMMANDS` and executor routing unchanged.
