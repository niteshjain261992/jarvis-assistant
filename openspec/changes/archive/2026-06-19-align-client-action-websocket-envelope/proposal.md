## Why

Outbound client-task frames from `requestFromClient` use an ad-hoc `{ type: 'client_task', requestId, action, input }` shape, while all other server→client WebSocket messages use the unified `{ code, message, data }` envelope via `sendEnvelope` in `messages.gateway.ts`. This inconsistency forces the iOS client to handle a one-off protocol branch. Aligning outbound delegation frames to the envelope pattern with `data.type: 'action'` lets the client reuse the same parsing path as completed pipeline action responses.

## What Changes

- Replace the raw `{ type: 'client_task', ... }` send in `client-task-broker.ts` with the standard `MessageEnvelope` shape (`{ code, message, data }`)
- Set `data.type` to `'action'` (not `'client_task'`) and map fields to match `CreateMessageResult` action fields: `actionName`, `actionPayload`, `actionExecutor`, plus `requestId` for correlation
- Add a shared envelope builder in `message-envelope.ts` (e.g. `actionRequestEnvelope`) used by the broker — same structural contract as `envelopeFromCreateMessageResult`, not a duplicate `ws.send(JSON.stringify(...))` ad-hoc object
- **BREAKING**: iOS/client consumers expecting `type: 'client_task'` must switch to parsing the envelope and `data.type === 'action'`
- Update broker unit tests for the new frame shape

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `client-task-broker`: Outbound frame format uses `MessageEnvelope` with `data.type: 'action'`
- `websocket-messages`: Document outbound action-request envelope alongside existing inbound `client_task_result` / `client_task_error` routing

## Impact

- **Modified**: `src/websocket/client-task-broker.ts`, `src/utils/message-envelope.ts`, `tests/websocket/client-task-broker.test.ts`
- **Specs**: delta updates to `client-task-broker`, `websocket-messages`
- **Out of scope**: Inbound `client_task_result` / `client_task_error` frame shapes (unchanged in this change); iOS client implementation
