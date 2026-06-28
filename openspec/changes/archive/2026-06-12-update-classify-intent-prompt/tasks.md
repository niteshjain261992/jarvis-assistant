## 1. Ollama service

- [x] 1.1 Replace `INTENT_SYSTEM_PROMPT` with the structured classifier prompt (definitions, examples, single-word response instruction)
- [x] 1.2 Update `tests/services/ollama.service.test.ts` — assert `body.system` contains classifier definitions and example phrases

## 2. Verification

- [x] 2.1 `npm test` passes with coverage >= 90%
- [x] 2.2 `npm run build` and `npm run lint` pass

## 3. Spec plane

- [x] 3.1 Update `openspec/codebase/interfaces/ollama.md` — document structured `classifyIntent` system prompt
