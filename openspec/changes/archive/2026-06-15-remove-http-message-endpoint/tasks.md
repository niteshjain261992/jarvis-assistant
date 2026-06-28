# Tasks

Source files in scope (closed-world): `src/app.ts`, `src/controllers/message.controller.ts` (delete), `src/routes/message.route.ts` (delete), `src/utils/api-response.ts`, `tests/controllers/message.controller.test.ts` (delete), `tests/app.test.ts`, `tests/utils/api-response.test.ts`, `openspec/codebase/interfaces/http.md`, `openspec/codebase/interfaces/message.md`, `openspec/codebase/map.md`.

## 1. Remove REST message route

- [x] 1.1 Delete `src/controllers/message.controller.ts` and `src/routes/message.route.ts`
- [x] 1.2 Remove `messageRouter` import and `app.use('/messages', ...)` from `src/app.ts`

## 2. Clean up api-response helpers

- [x] 2.1 Remove `SuccessResponse.MESSAGE_COMPLETED` and `SuccessResponse.MESSAGE_FAILED` from `src/utils/api-response.ts` (keep `successCodes` enum values)
- [x] 2.2 Update `tests/utils/api-response.test.ts` — remove MESSAGE_* HTTP sender tests; retain enum / other catalog coverage

## 3. Update tests

- [x] 3.1 Delete `tests/controllers/message.controller.test.ts`
- [x] 3.2 Update `tests/app.test.ts` — remove or replace the malformed JSON test that posts to `/messages` (e.g. assert `POST /messages` returns 404, or test malformed JSON on another path)

## 4. Update codebase interface docs

- [x] 4.1 Update `openspec/codebase/interfaces/http.md` — remove `/messages` router from `createApp` wiring and REST message section
- [x] 4.2 Update `openspec/codebase/interfaces/message.md` — describe WebSocket-only submission via gateway; remove `postMessage` controller docs
- [x] 4.3 Update `openspec/codebase/map.md` — remove `POST /messages` route row and deleted file entries

## 5. Verification

- [x] 5.1 Run `npm test` — all tests pass; branch coverage ≥ 90%
- [x] 5.2 Confirm `POST /messages` returns 404 and WebSocket message flow unchanged (`tests/websocket/messages.gateway.test.ts` still green)
