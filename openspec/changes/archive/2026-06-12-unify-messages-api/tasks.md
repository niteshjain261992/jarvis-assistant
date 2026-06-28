# Tasks

Source files in scope (closed-world): `src/models/message.model.ts`, `src/config/command-catalog.ts`, `src/repositories/message.repository.ts`, `src/repositories/conversation.repository.ts`, `src/services/message.service.ts`, `src/services/ollama.service.ts`, `src/controllers/message.controller.ts`, `src/routes/message.route.ts`, `src/utils/api-response.ts`, `tests/repositories/message.repository.test.ts`, `tests/repositories/conversation.repository.test.ts`, `tests/services/message.service.test.ts`, `tests/services/ollama.service.test.ts`, `tests/controllers/message.controller.test.ts`, `tests/utils/api-response.test.ts`, `tests/app.test.ts`, plus new files listed below.

## 1. Model & Catalog

- [x] 1.1 Update `src/models/message.model.ts` — add `parentId`, `pending` status, fix `type` enum to `text|action|image`
- [x] 1.2 Extend `src/config/command-catalog.ts` — add `executor` and `payload` metadata per command for action branch

## 2. Repositories

- [x] 2.1 Update `src/repositories/message.repository.ts` — align `MessageDocument` imports and `updateMessage` partial fields to new schema
- [x] 2.2 Add `findMessagesByConversationId` to message repository (for conversation context)
- [x] 2.3 Add `findActiveConversation(source)` to `src/repositories/conversation.repository.ts`

## 3. Ollama Service

- [x] 3.1 Add `classifyIntent(prompt)` to `src/services/ollama.service.ts`
- [x] 3.2 Add `generateConversationResponse(context, prompt)` to `src/services/ollama.service.ts`
- [x] 3.3 Remove or stop exporting unused `generateAcknowledgment` if no longer referenced

## 4. Message Service Pipeline

- [x] 4.1 Rewrite `src/services/message.service.ts` — `getOrCreateActiveConversation`, dual insert, intent branch, server action stub, return completed assistant payload
- [x] 4.2 Remove `getMessage` and `processCommand` exports

## 5. HTTP Layer

- [x] 5.1 Update `src/controllers/message.controller.ts` — `postMessage` returns `MESSAGE_COMPLETED`/`MESSAGE_FAILED`; remove `getMessageById`
- [x] 5.2 Update `src/routes/message.route.ts` — remove `GET /:messageId`
- [x] 5.3 Update `src/utils/api-response.ts` — remove `MESSAGE_ACCEPTED` and `MESSAGE_PROCESSING` if unused; ensure `MESSAGE_COMPLETED` payload fits new shape

## 6. Tests

- [x] 6.1 Update `tests/repositories/message.repository.test.ts` for new document shape
- [x] 6.2 Add `tests/repositories/conversation.repository.test.ts` coverage for `findActiveConversation` (or extend existing)
- [x] 6.3 Rewrite `tests/services/message.service.test.ts` for synchronous pipeline (conversation + action branches)
- [x] 6.4 Add/update `tests/services/ollama.service.test.ts` for `classifyIntent` and `generateConversationResponse`
- [x] 6.5 Rewrite `tests/controllers/message.controller.test.ts` — remove poll tests; assert `MESSAGE_COMPLETED` response
- [x] 6.6 Update `tests/utils/api-response.test.ts` and `tests/app.test.ts` for removed routes/codes

## 7. Verification

- [x] 7.1 `npm test` passes with coverage >= 90%
- [x] 7.2 `npm run build` and `npm run lint` pass

## 8. Spec Plane Updates

- [x] 8.1 Update `openspec/codebase/interfaces/message.md`, `interfaces/http.md`, `interfaces/api-response.md`, `interfaces/ollama.md`, `map.md`
- [x] 8.2 Sync docs with manual codebase changes (`client` executor, assistant `processing` insert, response omits message IDs)
