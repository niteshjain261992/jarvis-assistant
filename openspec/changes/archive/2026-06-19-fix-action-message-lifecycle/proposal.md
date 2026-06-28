## Why

The current message audit trail conflates the assistant turn placeholder and client-executed actions into a single MongoDB row. When a tool delegates to the client, the broker updates the assistant placeholder to `type: 'action'` and mutates it again on resolve — losing the intended three-record lifecycle (user → assistant text → action child). Separate rows are required so each phase has its own status, parent linkage to the user message, and independent completion timing.

## What Changes

- Keep the assistant placeholder as `type: 'text'`, `role: 'assistant'`, `parentId` = user message id; finalize it to `completed` or `failed` only when the agent turn finishes
- On client tool delegation, **insert** a new message row (`type: 'action'`, `role: 'assistant'`, `parentId` = user message id, `status: 'pending'`) instead of updating the assistant placeholder
- Use the new action row `_id` as the WebSocket `requestId` and broker correlation key
- On `resolveClientTask` / reject / timeout, update **only** the action row to `completed` or `failed` with `actionResult` / `errorDetails`
- On server-executed actions, insert a separate action row (completed immediately with `actionResult`) rather than converting the assistant placeholder
- Extend `ClientTaskPersistenceContext` with `userMessageId`, `actionMessageId`, and sequence metadata needed for inserts
- Adjust `runAgentTurn` finalization to read action outcomes from the action row and mark the assistant placeholder completed
- Update unit tests for broker, pipeline, and tool wiring

## Capabilities

### New Capabilities

_None — behavior extends existing message-pipeline and client-task-broker capabilities._

### Modified Capabilities

- `message-pipeline`: Three-record lifecycle for action turns; assistant placeholder remains `type: 'text'`; action rows are inserted as siblings under the user message
- `client-task-broker`: Persist pending/completed/failed states on a dedicated action message row (insert on delegation, update on terminal states) instead of mutating the assistant placeholder
- `agent-tools`: Persistence context carries action-row identity and parent linkage for broker inserts

## Impact

- `src/websocket/client-task-broker.ts` — insert action row on delegation; terminal updates target action row id
- `src/services/message.service.ts` — pass expanded context; finalize assistant row separately from action row; server-action insert path
- `src/agent/agent-runner.ts`, `src/agent/tools/types.ts`, `src/agent/tools/registry.ts`, `src/agent/tools/*.tool.ts` — expanded persistence context threading
- `tests/websocket/client-task-broker.test.ts`, `tests/services/message.service.test.ts`, `tests/agent/tools/*.tool.test.ts` — updated assertions
- MongoDB `messages` collection — up to three rows per action turn (user, assistant text, action child); no schema migration required
