## 1. Tool persistence module

- [x] 1.1 Create `src/agent/tools/tool-persistence.ts` with `ClientTaskPersistenceContext`, `insertPendingToolAction`, `completePendingToolAction`, `failPendingToolAction`, and exported `withToolPersistence`
- [x] 1.2 Implement result normalization (plain object as-is; primitives and arrays wrapped as `{ value: result }`)
- [x] 1.3 Ensure persistence errors are logged and non-fatal; execution errors re-thrown after fail update

## 2. Strip persistence from client-task-broker

- [x] 2.1 Remove `persistPendingAction`, `persistCompletedAction`, `persistFailedAction`, and `normalizeActionResult` from `src/websocket/client-task-broker.ts`
- [x] 2.2 Remove `messageId` from `pendingRequests` map entries and all persistence calls in resolve/reject/timeout paths
- [x] 2.3 Change `requestFromClient` signature to `(ws, action, input, timeoutMs?)` — remove `context` parameter
- [x] 2.4 Remove `ClientTaskPersistenceContext` interface and `messageRepository` import from broker

## 3. Update tool layer imports and exports

- [x] 3.1 Update `src/agent/tools/types.ts` to import `ClientTaskPersistenceContext` from `./tool-persistence.js`
- [x] 3.2 Update `src/agent/tools/index.ts` to re-export `withToolPersistence` and `ClientTaskPersistenceContext` from `./tool-persistence.js`

## 4. Wrap client tools with withToolPersistence

- [x] 4.1 Update `src/agent/tools/open-camera.tool.ts` — wrap `requestFromClient` with `withToolPersistence` when context present
- [x] 4.2 Update `src/agent/tools/off-lights.tool.ts` — same pattern as open-camera
- [x] 4.3 Update `src/agent/tools/play-music/index.ts` — wrap with `withToolPersistence` (executor `'client'`), keep `handleJarvisError` try/catch outside the wrapper

## 5. Unit tests — tool persistence

- [x] 5.1 Create `tests/agent/tools/tool-persistence.test.ts` with mocks for `message.repository`, `logger`, and `isJarvisError`
- [x] 5.2 Test pending insert before execute, completed update on success, failed update and re-throw on error
- [x] 5.3 Test non-fatal persistence failures on insert and update
- [x] 5.4 Test result normalization for objects, primitives, and arrays

## 6. Unit tests — update existing suites

- [x] 6.1 Update `tests/agent/tools/open-camera.tool.test.ts` — no context arg to broker; persistence when context provided
- [x] 6.2 Update `tests/agent/tools/off-lights.tool.test.ts` — same updates as open-camera
- [x] 6.3 Update `tests/agent/tools/play-music.tool.test.ts` — persistence + CLIENT_TIMEOUT graceful result with failed row
- [x] 6.4 Update `tests/websocket/client-task-broker.test.ts` — remove persistence assertions and context parameter tests

## 7. Verification

- [x] 7.1 Run `npm test` and confirm pass with coverage above 90%
- [x] 7.2 Confirm zero grep hits for `persistPendingAction`, `persistCompletedAction`, `persistFailedAction` in `src/`
- [x] 7.3 Confirm `requestFromClient` no longer accepts `context` in its signature
