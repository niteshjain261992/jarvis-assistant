# Tasks

Source files in scope (closed-world): `package.json`, `src/config/env.ts`, `.env.example`, `src/utils/api-response.ts`, `src/app.ts`, `src/server.ts`, `tests/config/env.test.ts`, `tests/app.test.ts`, plus new files listed below. **Remove**: `src/controllers/acknowledge.controller.ts`, `src/controllers/command.controller.ts`, `src/routes/acknowledge.route.ts`, `src/routes/command.route.ts`, `tests/controllers/acknowledge.controller.test.ts`, `tests/controllers/command.controller.test.ts`.

## 1. MongoDB & Configuration

- [x] 1.1 Install `mongodb` (dependency) and `mongodb-memory-server` (devDependency)
- [x] 1.2 Add `MONGODB_URI` and `MONGODB_DATABASE` to `src/config/env.ts` and `.env.example`
- [x] 1.3 Create `src/config/mongodb.ts` — connect/disconnect helpers; export `getDb()` (singleton client)

## 2. Repository & Service

- [x] 2.1 Create `src/repositories/message.repository.ts` — `insert`, `findById`, `updateStatus` on `messages` collection (string UUID `_id`)
- [x] 2.2 Create `src/services/message.service.ts` — `createMessage(prompt)`: insert → `generateAcknowledgment` → update ack → return `{ messageId, text }` → fire `processCommand(messageId)` in background; `getMessage(messageId)` for poll; `processCommand` calls `interpretCommand`, sets `completed` or `failed`

## 3. HTTP Layer

- [x] 3.1 Add `successCodes` (`MESSAGE_ACCEPTED`, `MESSAGE_PROCESSING`, `MESSAGE_COMPLETED`, `MESSAGE_FAILED`) and matching `SuccessResponse` entries in `src/utils/api-response.ts`
- [x] 3.2 Create `src/controllers/message.controller.ts` — `postMessage`, `getMessageById`
- [x] 3.3 Create `src/routes/message.route.ts` — `POST /`, `GET /:messageId`
- [x] 3.4 Update `src/app.ts` — mount `/messages`; remove `/acknowledge` and `/command` routers
- [x] 3.5 Update `src/server.ts` — connect MongoDB on boot, disconnect on shutdown

## 4. Cleanup

- [x] 4.1 Delete acknowledge + command controllers, routes, and their test files

## 5. Tests

- [x] 5.1 Create `tests/repositories/message.repository.test.ts` (mongodb-memory-server) — insert, find, update
- [x] 5.2 Create `tests/services/message.service.test.ts` — mocked repo + ollama: create flow, background complete/fail, get by id
- [x] 5.3 Create `tests/controllers/message.controller.test.ts` — supertest: POST accept, GET processing/completed/404
- [x] 5.4 Update `tests/config/env.test.ts` (MongoDB defaults); remove obsolete acknowledge/command tests

## 6. Verification

- [x] 6.1 `npm test` passes with coverage >= 90%
- [x] 6.2 `npm run build` and `npm run lint` pass
- [x] 6.3 Live test (MongoDB + Ollama running): `POST /messages` → poll until `MESSAGE_COMPLETED`

## 7. Spec Plane Updates

- [x] 7.1 Update `openspec/codebase/map.md`, `interfaces/http.md`, `interfaces/api-response.md`, `interfaces/config.md`; create `interfaces/message.md`, `interfaces/mongodb.md`
