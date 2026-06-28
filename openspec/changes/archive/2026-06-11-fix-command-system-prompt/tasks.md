# Tasks

Source files in scope (closed-world): `src/services/ollama.service.ts`, `tests/services/ollama.service.test.ts`, `openspec/codebase/interfaces/ollama.md`.

## 1. Prompt Update

- [x] 1.1 In `src/services/ollama.service.ts`, change `COMMAND_SYSTEM_PROMPT` first line from home assistant to Jarvis personal agent (per design.md); leave format rules and examples unchanged

## 2. Tests

- [x] 2.1 In `tests/services/ollama.service.test.ts`, assert `interpretCommand` sends a `system` field containing `Jarvis` (mirror ack test pattern)

## 3. Verification

- [x] 3.1 `npm test` passes with coverage >= 90%
- [x] 3.2 `npm run build` and `npm run lint` pass

## 4. Spec Plane

- [x] 4.1 Update `openspec/codebase/interfaces/ollama.md` — document Jarvis agent framing on `interpretCommand` system instruction
