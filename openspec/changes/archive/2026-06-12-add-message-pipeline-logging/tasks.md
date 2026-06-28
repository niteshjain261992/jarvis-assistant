# Tasks

Source files in scope (closed-world): `src/controllers/message.controller.ts`, `src/services/message.service.ts`, `src/services/ollama.service.ts`, `src/services/conversation-summary.service.ts`, `tests/controllers/message.controller.test.ts`, `tests/services/message.service.test.ts`, `tests/services/ollama.service.test.ts`, `tests/services/conversation-summary.service.test.ts`, plus spec-plane updates listed below.

## 1. Controller Logging

- [x] 1.1 Add `debug` log in `postMessage` on valid request — `promptLength` only, no prompt body

## 2. Message Service Pipeline Logs

- [x] 2.1 Log conversation resolved/created with `conversationId` and `created: boolean`
- [x] 2.2 Log dual message insert with `userMessageId`, `assistantMessageId`
- [x] 2.3 Log intent classified, branch entered, action resolved, and pipeline completed/failed
- [x] 2.4 Update `tests/services/message.service.test.ts` — assert key `logger.debug` calls

## 3. Ollama LLM Logging

- [x] 3.1 Add `llmOperation` parameter to `callOllama` (or wrap callers) — log `durationMs` on success
- [x] 3.2 Update `tests/services/ollama.service.test.ts` if logger assertions added

## 4. Summary Service Logs

- [x] 4.1 Log summary job enqueued (`summaryJob: 'enqueued'`) in `enqueueConversationSummary`
- [x] 4.2 Log summary persisted (`summaryJob: 'persisted'`, `rolling: boolean`) in `processSummaryJob`
- [x] 4.3 Update `tests/services/conversation-summary.service.test.ts` — assert debug logs

## 5. Verification

- [x] 5.1 `npm test` passes with coverage >= 90%
- [x] 5.2 `npm run build` and `npm run lint` pass

## 6. Spec Plane Updates

- [x] 6.1 Update `openspec/codebase/interfaces/message.md`, `interfaces/ollama.md`, `interfaces/conversation.md`, `interfaces/logger.md`, `map.md`
