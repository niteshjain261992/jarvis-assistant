## 1. Command catalog

- [x] 1.1 Expand `COMMAND_CATALOG.phrases` with trigger phrases currently only in the hardcoded prompt
- [x] 1.2 Refactor `buildCommandSystemPrompt()` — generate trigger lines and per-command examples from `COMMAND_CATALOG`; keep static rules and `UNKNOWN:NONE` sections

## 2. Tests

- [x] 2.1 Update `tests/config/command-catalog.test.ts` — assert every catalog command and all phrases appear in generated prompt; test stays in sync when catalog grows
- [x] 2.2 Update `tests/services/ollama.service.test.ts` if example line format changes

## 3. Verification

- [x] 3.1 `npm test` passes with coverage >= 90%
- [x] 3.2 `npm run build` and `npm run lint` pass

## 4. Spec plane

- [x] 4.1 Update `openspec/codebase/interfaces/ollama.md` — document catalog-driven `buildCommandSystemPrompt()`
