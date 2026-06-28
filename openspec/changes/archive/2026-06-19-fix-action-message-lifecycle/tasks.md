## 1. Persistence context

- [x] 1.1 Update `ClientTaskPersistenceContext` in `src/websocket/client-task-broker.ts` to `{ conversationId, userMessageId, actionSequenceNumber }` (remove assistant `messageId`)
- [x] 1.2 Re-export the updated type from `src/agent/tools/types.ts` and ensure `runAgent` / `buildToolsForConnection` signatures remain compatible

## 2. Client task broker

- [x] 2.1 Replace `persistPendingAction` `updateMessage` with `insertMessage` for a new action row (`type: 'action'`, `role: 'assistant'`, `parentId: userMessageId`, `status: 'pending'`, action fields)
- [x] 2.2 Generate `actionMessageId` per delegation; use it as `requestId` in the outbound envelope and pending map `messageId`
- [x] 2.3 Keep `persistCompletedAction` / `persistFailedAction` updating the action row id only (not the assistant placeholder)
- [x] 2.4 Update `tests/websocket/client-task-broker.test.ts` for insert-on-delegate, action-id correlation, and no assistant-row updates

## 3. Message pipeline

- [x] 3.1 Set assistant placeholder insert to explicit `type: 'text'` in `preparePipelineContext`
- [x] 3.2 Pass `{ conversationId, userMessageId, actionSequenceNumber: assistantSequence + 1 }` from `runAgentTurn` into `runAgent`
- [x] 3.3 Refactor client-action finalization: load completed action row by user message parent; build `CreateMessageResult` from action row; finalize assistant placeholder to `status: 'completed'` with `model` (keep `type: 'text'`)
- [x] 3.4 Refactor server-action finalization: insert completed action row at `actionSequenceNumber`; finalize assistant placeholder separately
- [x] 3.5 Advance `lastSequenceNumber` to `actionSequenceNumber` for action turns, `assistantSequence` for text/clarify turns
- [x] 3.6 Update `tests/services/message.service.test.ts` for three-row lifecycle and assistant row remaining `type: 'text'`

## 4. Agent tools tests

- [x] 4.1 Update tool test fixtures in `tests/agent/tools/*.tool.test.ts` to use expanded persistence context shape
- [x] 4.2 Update `tests/agent/agent-runner.test.ts` context fixture if it asserts on old `messageId` field

## 5. Verification

- [x] 5.1 Run `npm test` and fix any remaining failures
- [x] 5.2 Manually verify message rows for a client-action turn: user (text/completed) → assistant (text/completed) → action (action/completed with result)
