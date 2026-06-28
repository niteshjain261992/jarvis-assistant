# Tasks

Source files in scope (closed-world): `package.json`, `src/config/agenda.ts`, `src/jobs/conversation-summary.job.ts`, `src/services/conversation-summary.service.ts`, `src/services/ollama.service.ts`, `src/services/message.service.ts`, `src/server.ts`, `tests/services/conversation-summary.service.test.ts`, `tests/services/ollama.service.test.ts`, `tests/services/message.service.test.ts`, `tests/config/agenda.test.ts`, plus spec-plane updates listed below.

## 1. Dependencies & Agenda Config

- [x] 1.1 Add `agenda` to `package.json` dependencies (verify ESM compatibility)
- [x] 1.2 Create `src/config/agenda.ts` — `createAgenda`, `startAgenda`, `stopAgenda` using `env.MONGODB_URI` / `env.MONGODB_DATABASE`

## 2. Ollama Summarization

- [x] 2.1 Add `summarizeText(input: string)` to `src/services/ollama.service.ts` with summary system prompt, timeout, and empty-response handling
- [x] 2.2 Add tests in `tests/services/ollama.service.test.ts` for `summarizeText`

## 3. Summary Service & Job

- [x] 3.1 Create `src/services/conversation-summary.service.ts` — `buildExchangeText`, `processSummaryJob` (first vs rolling paths), `enqueueConversationSummary`
- [x] 3.2 Create `src/jobs/conversation-summary.job.ts` — register `update-conversation-summary` handler calling `processSummaryJob`
- [x] 3.3 Create `tests/services/conversation-summary.service.test.ts` — first summary, rolling update, missing conversation

## 4. Pipeline Integration

- [x] 4.1 Update `src/services/message.service.ts` — call `enqueueConversationSummary` before each `status: 'completed'` return (text + action branches); skip on failure
- [x] 4.2 Update `tests/services/message.service.test.ts` — assert enqueue on success, no enqueue on failure/LLM error

## 5. Server Lifecycle

- [x] 5.1 Update `src/server.ts` — start Agenda after Mongo connect, register jobs, `stopAgenda` on graceful shutdown
- [x] 5.2 Add `tests/config/agenda.test.ts` — smoke test create/start/stop (or mock-based)

## 6. Verification

- [x] 6.1 `npm test` passes with coverage >= 90%
- [x] 6.2 `npm run build` and `npm run lint` pass

## 7. Spec Plane Updates

- [x] 7.1 Update `openspec/codebase/interfaces/conversation.md`, `interfaces/message.md`, `interfaces/ollama.md`, `map.md`
