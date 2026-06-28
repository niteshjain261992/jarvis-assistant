# Tasks

Source files in scope (closed-world): plus new files listed below. **No modifications** to `src/app.ts`, `src/server.ts`, `src/services/**`, `src/controllers/**`, or `src/routes/**`.

## 1. Repository

- [x] 1.1 Create `src/repositories/conversation.repository.ts` — `ConversationSource`, `ConversationStatus`, `ConversationDocument` types; collection `conversations`; `insertConversation`, `findConversationById`, `updateConversation` (mirrors `message.repository` patterns)

## 2. Tests

- [x] 2.1 Create `tests/repositories/conversation.repository.test.ts` — mongodb-memory-server: insert + find, null lookup, partial update with `updatedAt` refresh

## 3. Isolation check

- [x] 3.1 Verify no file under `src/services/`, `src/controllers/`, `src/routes/`, `src/app.ts`, or `src/server.ts` imports `conversation.repository`

## 4. Verification

- [x] 4.1 `npm test` passes with coverage >= 90%
- [x] 4.2 `npm run build` and `npm run lint` pass

## 5. Spec Plane Updates

- [x] 5.1 Create `openspec/codebase/interfaces/conversation.md` documenting repository exports and document shape
- [x] 5.2 Update `openspec/codebase/map.md` — add `src/repositories/conversation.repository.ts` row
