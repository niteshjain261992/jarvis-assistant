## Why

Client-executor actions are delegated to the iOS client via `requestFromClient`, but the only durable record today is written after the full agent turn completes. There is no MongoDB row reflecting the in-flight `pending` state or the client `actionResult` at the moment `resolveClientTask` fires. Persisting action messages when delegation starts and completing them on client response gives an accurate audit trail, enables future reconnect/resume work, and aligns database `status` with the WebSocket envelope (`data.status: 'pending'` → `'completed'`).

## What Changes

- Extend `requestFromClient` to accept pipeline persistence context and write/update the assistant message row to `type: 'action'`, `status: 'pending'` with `actionName`, `actionExecutor: 'client'`, and `actionPayload` when delegating to the client
- On `resolveClientTask`, update the correlated message row to `status: 'completed'` and persist `actionResult` from the client response
- On `rejectClientTask` and broker timeout, update the correlated message row to `status: 'failed'` with `errorDetails`
- Thread persistence context from `message.service` through `runAgent` → tool factories → `requestFromClient` (assistant `messageId` used as `requestId` for WS/DB correlation)
- Adjust `runAgentTurn` client-action completion so it does not overwrite an already-completed row set by `resolveClientTask`; final WebSocket response still returns the completed action outcome
- Add/update unit tests for broker persistence, tool wiring, and pipeline client-action scenarios

## Capabilities

### New Capabilities

_None — behavior extends existing client-task and message-pipeline capabilities._

### Modified Capabilities

- `client-task-broker`: Persist pending action messages on delegation; complete or fail them on resolve/reject/timeout
- `message-pipeline`: Client-executor action turns reflect `pending` during delegation and `completed` with `actionResult` after client response; pipeline finalization respects broker-completed rows
- `agent-tools`: Tool factories receive persistence context and pass it to `requestFromClient`

## Impact

- `src/websocket/client-task-broker.ts` — persistence on request/resolve/reject/timeout
- `src/services/message.service.ts` — pass `PipelineContext` into agent/tools; adjust client-action finalization
- `src/agent/agent-runner.ts`, `src/agent/tools/registry.ts`, `src/agent/tools/types.ts`, `src/agent/tools/*.tool.ts` — thread persistence context
- `tests/websocket/client-task-broker.test.ts`, `tests/agent/tools/*.tool.test.ts` — new persistence assertions
- MongoDB `messages` collection — assistant rows transition `processing` → `pending` (action) → `completed`/`failed` for client-executor turns
- No breaking WebSocket envelope changes (already uses `type: 'action'`, `status: 'pending'`)
