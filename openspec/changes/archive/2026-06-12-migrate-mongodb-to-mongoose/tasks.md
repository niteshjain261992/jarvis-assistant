# Tasks

Source files in scope (closed-world): `package.json`, `src/config/mongodb.ts`, `src/repositories/message.repository.ts`, `src/repositories/conversation.repository.ts`, `tests/config/mongodb.test.ts`, `tests/repositories/message.repository.test.ts`, `tests/repositories/conversation.repository.test.ts`, plus new files listed below. **No changes** to `src/server.ts`, `src/services/**`, `src/controllers/**`, `src/routes/**`, or `src/config/env.ts`.

## 1. Dependencies

- [x] 1.1 Add `mongoose` to `package.json` dependencies
- [x] 1.2 Remove `mongodb` from `package.json` dependencies (run `npm install`)

## 2. Mongoose Models

- [x] 2.1 Create `src/models/message.model.ts` — schema + `MessageModel` for `messages` collection (string `_id`, fields matching `MessageDocument`)
- [x] 2.2 Create `src/models/conversation.model.ts` — schema + `ConversationModel` for `conversations` collection (string `_id`, fields matching `ConversationDocument`)

## 3. Connection Layer

- [x] 3.1 Rewrite `src/config/mongodb.ts` — `connectMongo` uses `mongoose.connect(uri, { dbName })`, `disconnectMongo` uses `mongoose.disconnect`; remove `getDb()`; preserve singleton idempotent connect

## 4. Repository Layer

- [x] 4.1 Refactor `src/repositories/message.repository.ts` — use `MessageModel` instead of native `Collection`/`getDb()`
- [x] 4.2 Refactor `src/repositories/conversation.repository.ts` — use `ConversationModel` instead of native `Collection`/`getDb()`

## 5. Tests

- [x] 5.1 Update `tests/config/mongodb.test.ts` — assert via `mongoose.connection` instead of `getDb()`
- [x] 5.2 Update `tests/repositories/message.repository.test.ts` — use `MessageModel.deleteMany({})` for cleanup
- [x] 5.3 Update `tests/repositories/conversation.repository.test.ts` — use `ConversationModel.deleteMany({})` for cleanup

## 6. Verification

- [x] 6.1 `npm test` passes with coverage >= 90%
- [x] 6.2 `npm run build` and `npm run lint` pass

## 7. Spec Plane Updates

- [x] 7.1 Update `openspec/codebase/interfaces/mongodb.md` — Mongoose connection exports, remove `getDb`
- [x] 7.2 Update `openspec/codebase/interfaces/message.md` and `interfaces/conversation.md` — reference Mongoose models
- [x] 7.3 Update `openspec/codebase/map.md` — add `src/models/` entries, update `mongodb.ts` description
