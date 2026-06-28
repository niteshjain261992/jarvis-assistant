## MODIFIED Requirements

### Requirement: Client task request correlation

The system SHALL provide `requestFromClient(ws: WebSocket, action: string, input: Record<string, unknown>, context?: ClientTaskPersistenceContext): Promise<unknown>` in `src/websocket/client-task-broker.ts`. The function SHALL use `context.messageId` as `requestId` when `context` is provided, otherwise SHALL generate a unique `requestId` via `crypto.randomUUID()`. It SHALL send a JSON text frame using the standard WebSocket `MessageEnvelope` shape (`{ code, message, data }`) produced by `actionRequestEnvelope` from `message-envelope.ts`, and return a Promise that resolves when `resolveClientTask(requestId, result)` is called or rejects when `rejectClientTask(requestId, error)` is called or when the request times out. The envelope `data` object SHALL have `type: 'action'`, `status: 'pending'`, `requestId`, `actionName` (from the `action` argument), `actionExecutor: 'client'`, and `actionPayload` (from the `input` argument). When `context` is provided, the function SHALL update the message row identified by `context.messageId` to `type: 'action'`, `status: 'pending'`, `actionName`, `actionExecutor: 'client'`, and `actionPayload` before sending the WebSocket frame.

#### Scenario: Outbound action request envelope

- **WHEN** `requestFromClient` is called with a WebSocket, action `OPEN:CAMERA`, and input `{ target: 'camera' }`
- **THEN** the WebSocket receives a JSON text frame with top-level keys `code`, `message`, and `data`
- **AND** `data.type` is `'action'`
- **AND** `data.actionName` is `'OPEN:CAMERA'`
- **AND** `data.actionPayload` is `{ target: 'camera' }`
- **AND** `data.requestId` is a non-empty string
- **AND** `data.actionExecutor` is `'client'`

#### Scenario: Pending action persisted on delegation

- **WHEN** `requestFromClient` is called with a `ClientTaskPersistenceContext` whose `messageId` is the assistant placeholder id
- **THEN** the message row with `_id` equal to `messageId` is updated to `type: 'action'`, `status: 'pending'`, matching `actionName`, `actionExecutor: 'client'`, and `actionPayload`
- **AND** `data.requestId` in the outbound frame equals `messageId`

#### Scenario: Resolve completes pending request

- **WHEN** `requestFromClient` is in flight and `resolveClientTask(requestId, result)` is called with the matching `requestId`
- **THEN** the returned Promise resolves with `result`
- **AND** when the request was created with persistence context, the message row with `_id` equal to `requestId` is updated to `status: 'completed'` with `actionResult` set from `result`

#### Scenario: Reject completes pending request with error

- **WHEN** `requestFromClient` is in flight and `rejectClientTask(requestId, error)` is called with the matching `requestId`
- **THEN** the returned Promise rejects with an error carrying `error`
- **AND** when the request was created with persistence context, the message row with `_id` equal to `requestId` is updated to `status: 'failed'` with `errorDetails` set to `error`

## ADDED Requirements

### Requirement: Client task message persistence on terminal states

When a client task request was created with `ClientTaskPersistenceContext`, `resolveClientTask` SHALL update the correlated message row to `status: 'completed'` and persist `actionResult`. `rejectClientTask` and the broker timeout handler SHALL update the correlated message row to `status: 'failed'` with `errorDetails`. Persistence errors SHALL be logged and SHALL NOT prevent in-memory promise resolution or rejection.

#### Scenario: Timeout marks message failed

- **WHEN** a client task request with persistence context exceeds `CLIENT_TASK_TIMEOUT_MS` without a response
- **THEN** the correlated message row is updated to `status: 'failed'` with timeout `errorDetails`
- **AND** the Promise rejects with a timeout error

#### Scenario: Unknown requestId skips persistence

- **WHEN** `resolveClientTask` or `rejectClientTask` is called for a `requestId` not in the pending map
- **THEN** no message row is updated and no error is thrown

### Requirement: Client task broker unit tests

The change SHALL include Jest unit tests for `client-task-broker.ts` covering outbound frame shape, resolve/reject completion, timeout with map cleanup, no-op behavior for unknown request IDs, and message persistence on pending, completed, and failed transitions when context is provided.

#### Scenario: Tests under tests/websocket/

- **WHEN** the broker test suite is listed
- **THEN** test files reside under `tests/websocket/` and are discovered by `npm test`
