# Tasks

Source files in scope (closed-world): `src/models/message.model.ts`, `openspec/codebase/interfaces/message.md` only. **No changes** to `src/repositories/**`, `src/services/**`, `src/controllers/**`, `src/routes/**`, or `tests/**` in this iteration.

## 1. Message Model

- [x] 1.1 Rewrite `src/models/message.model.ts` — new `MessageDocument` with `conversationId`, `type`, `role`, `sequenceNumber`, `content`, action fields, `model`, `status`, `errorDetails`, timestamps; export `MessageType`, `MessageRole`, `MessageActionExecutor`, `MessageStatus`; keep `MessageModel` export and `messages` collection

## 2. Verification

- [x] 2.1 `npm run build` compiles `src/models/message.model.ts` (repository/service type errors expected and acceptable this iteration)
- [x] 2.2 `npm run lint` passes on changed files

## 3. Spec Plane Updates

- [x] 3.1 Update `openspec/codebase/interfaces/message.md` — add/update model section with restructured `MessageDocument` shape (repository/service sections unchanged)
