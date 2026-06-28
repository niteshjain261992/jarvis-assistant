## Why

`interpretCommand` relies on a few loose examples in `COMMAND_SYSTEM_PROMPT`, so the LLM invents inconsistent targets for the same intent (e.g. `OPEN:CAMERA` vs `OPEN:VIDEO_CAMERA` vs `OPEN:VIDEOCAM` for "open camera"). The mobile client needs a **stable, canonical** `ACTION:TARGET` string every time. Hardcoding the full supported command catalog in the system prompt gives the model an explicit closed set to choose from.

## What Changes

- Introduce a **command catalog** (`src/config/command-catalog.ts`) as the single source of truth for every allowed `ACTION:TARGET` and example natural-language phrases.
- Build `COMMAND_SYSTEM_PROMPT` from the catalog — listing every canonical command and phrase hints (no free-form invention).
- After LLM response, compare normalized output to `ALLOWED_COMMANDS`; if not a catalog match, **return the normalized string as-is** (passthrough, no error).
- Extend tests to assert prompt contains catalog entries and passthrough behavior for non-catalog output.
- Update spec plane (`interfaces/ollama.md`).

No HTTP API, envelope, or MongoDB changes.

## Capabilities

### New Capabilities

- `command-catalog`: Canonical list of supported `ACTION:TARGET` commands and phrase hints used by interpretation.

### Modified Capabilities

- `command-interpretation`: Ollama system instruction SHALL use the full hardcoded catalog; non-catalog LLM output SHALL passthrough as the normalized response string.

## Impact

- `src/config/command-catalog.ts` (new)
- `src/services/ollama.service.ts` — prompt construction + passthrough for non-catalog output
- `tests/services/ollama.service.test.ts` — catalog in prompt, passthrough cases
- `openspec/codebase/interfaces/ollama.md`
