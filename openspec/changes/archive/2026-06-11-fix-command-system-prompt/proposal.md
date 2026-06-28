## Why

`COMMAND_SYSTEM_PROMPT` in `ollama.service.ts` still frames the model as a generic "home assistant" command interpreter, while the product identity is **Jarvis** — the acknowledgment path already uses a Jarvis persona. Aligning the command-interpreter system prompt with the Jarvis agent avoids mixed personas and keeps interpretation consistent with the async message flow.

## What Changes

- Update `COMMAND_SYSTEM_PROMPT` in `src/services/ollama.service.ts` to describe a **Jarvis agent** command interpreter (not a home assistant).
- Keep output contract unchanged: exactly one `ACTION:TARGET` command, uppercase, no extra text.
- Add a unit test asserting the command system prompt references Jarvis (mirrors the existing ack test).
- Update spec plane docs (`interfaces/ollama.md`) to document the Jarvis framing.

No HTTP API, envelope, or database changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `command-interpretation`: Ollama system-instruction requirement SHALL describe a Jarvis agent command interpreter (persona alignment only; `ACTION:TARGET` contract unchanged).

## Impact

- `src/services/ollama.service.ts` — `COMMAND_SYSTEM_PROMPT` string
- `tests/services/ollama.service.test.ts` — assert Jarvis in command `system` field
- `openspec/codebase/interfaces/ollama.md` — document Jarvis persona on `interpretCommand`
- `openspec/specs/command-interpretation/spec.md` — delta sync on archive (system-instruction wording)
