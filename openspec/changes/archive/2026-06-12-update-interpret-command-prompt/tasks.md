## 1. Command catalog

- [x] 1.1 Replace `buildCommandSystemPrompt()` with the structured command-parser prompt (rules, triggers, examples, `UNKNOWN:NONE`)
- [x] 1.2 Update `tests/config/command-catalog.test.ts` — assert parser rules, triggers, examples, and catalog commands in prompt

## 2. Ollama service tests

- [x] 2.1 Update `tests/services/ollama.service.test.ts` — assert `body.system` contains parser structure; add `UNKNOWN:NONE` normalization case if needed

## 3. Verification

- [x] 3.1 `npm test` passes with coverage >= 90%
- [x] 3.2 `npm run build` and `npm run lint` pass

## 4. Spec plane

- [x] 4.1 Update `openspec/codebase/interfaces/ollama.md` — document structured `interpretCommand` system prompt
