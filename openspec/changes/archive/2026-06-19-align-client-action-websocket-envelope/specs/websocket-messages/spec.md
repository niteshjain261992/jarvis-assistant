## ADDED Requirements

### Requirement: Outbound action request envelope

When the server delegates a client-executor action via `requestFromClient`, the outbound WebSocket frame SHALL use the same `{ code, message, data }` envelope shape as chat pipeline responses. The `data` object SHALL use `type: 'action'` and action field names consistent with `CreateMessageResult` (`actionName`, `actionExecutor`, `actionPayload`), plus `requestId` and `status: 'pending'` for in-flight delegation.

#### Scenario: Action delegation matches envelope convention

- **WHEN** a client-executor tool triggers `requestFromClient` during an agent turn
- **THEN** the client receives a frame parseable with the same envelope handler as `MESSAGE_COMPLETED` responses
- **AND** `data.type` is `'action'` (not `'client_task'`)
