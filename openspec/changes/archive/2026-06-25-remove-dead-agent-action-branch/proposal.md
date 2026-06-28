## Why

When client tools were refactored to execute fully inside their LangChain handler via `requestFromClient`, action persistence moved to `client-task-broker.ts` and `createAgent` always ends its loop with a final `AIMessage`. The `ToolMessage` branch in `resolveAgentRunResult` and the `kind: 'action'` path in `runAgentTurn` are now unreachable dead code that obscures the real execution model and adds maintenance burden.

## What Changes

- Remove `AgentRunResult` `kind: 'action'` variant — `runAgent` returns only `text` or `clarify`.
- Simplify `resolveAgentRunResult` to read only the last `AIMessage`; remove `ToolMessage` parsing and `parseToolHandlerResult`.
- Remove `runServerAction` and the entire `kind: 'action'` branch in `runAgentTurn` — both `text` and `clarify` persist the assistant row as `type: 'text'`.
- Remove `findLatestActionMessageByParentId` call site in `runAgentTurn` (repository function stays).
- Update specs and tests to reflect the simplified model.
- **BREAKING (internal API)**: `AgentRunResult` no longer includes `kind: 'action'`. `createMessage` WebSocket responses for tool-invoking turns return `type: 'text'` with the agent's final message; action rows are still persisted by the broker during tool execution.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `agent-runner`: Remove action result kind; `resolveAgentRunResult` only handles final `AIMessage`.
- `message-pipeline`: `runAgentTurn` always persists assistant as `type: 'text'`; remove `kind: 'action'` mapping from agent result.
- `message-pipeline-logging`: Remove action-resolved log scenario tied to dead `kind: 'action'` path.

## Impact

- **Code**: `src/agent/agent-runner.ts`, `src/services/message.service.ts`, `tests/agent/agent-runner.test.ts`, `tests/services/message.service.test.ts`
- **Unchanged**: `client-task-broker.ts`, `message.repository.ts`, `MessageModel`, `CreateMessageResult` shape, `findLatestActionMessageByParentId` in repository, broker action row persistence, `message-envelope.ts`, `conversation-summary.service.ts`
- **Behavior**: Tool-invoking turns return `CreateMessageResult.type: 'text'` (agent's final AIMessage) instead of re-reading broker action rows for the WebSocket response
