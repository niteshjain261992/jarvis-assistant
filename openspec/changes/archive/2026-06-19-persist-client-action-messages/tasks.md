## 1. Types and wiring

- [x] 1.1 Add `ClientTaskPersistenceContext` (`messageId`, `conversationId`) to `src/agent/tools/types.ts` and export it from `src/agent/tools/index.ts`
- [x] 1.2 Update `ClientToolFactory`, `buildToolsForConnection`, and each `build*Tool` factory to accept optional `context` and pass it to `requestFromClient`
- [x] 1.3 Extend `runAgent(input, ws, context?)` to forward `context` to `buildToolsForConnection`
- [x] 1.4 Pass `{ messageId: assistantMessageId, conversationId }` from `runAgentTurn` in `src/services/message.service.ts`

## 2. Broker persistence

- [x] 2.1 Extend `requestFromClient` signature with optional `context`; use `context.messageId` as `requestId` when provided
- [x] 2.2 On delegation with context, `updateMessage` assistant row to `type: 'action'`, `status: 'pending'`, `actionName`, `actionExecutor: 'client'`, `actionPayload` (log errors, do not block send)
- [x] 2.3 Store `messageId` in pending map entries when context is provided
- [x] 2.4 On `resolveClientTask`, update correlated row to `status: 'completed'` with normalized `actionResult`
- [x] 2.5 On `rejectClientTask` and timeout, update correlated row to `status: 'failed'` with `errorDetails`

## 3. Pipeline finalization

- [x] 3.1 Adjust `runAgentTurn` client-action path to avoid overwriting broker-completed rows; include `actionResult` in `CreateMessageResult` and WebSocket response
- [x] 3.2 Ensure `model` is still set on the assistant row for completed client actions

## 4. Tests

- [x] 4.1 Update `tests/websocket/client-task-broker.test.ts` — mock `messageRepository`; assert pending/completed/failed updates with context
- [x] 4.2 Update `tests/agent/tools/*.tool.test.ts` — pass mock context; assert `requestFromClient` receives it
- [x] 4.3 Update agent-runner tests if signature changes require mock context passthrough
- [x] 4.4 Run `npm test` and fix any failures
