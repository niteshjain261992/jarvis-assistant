## ADDED Requirements

### Requirement: Client task request correlation

The system SHALL provide `requestFromClient(ws: WebSocket, action: string, input: Record<string, unknown>): Promise<unknown>` in `src/websocket/client-task-broker.ts`. The function SHALL generate a unique `requestId` via `crypto.randomUUID()`, send a JSON frame `{ type: 'client_task', requestId, action, input }` over the provided WebSocket, and return a Promise that resolves when `resolveClientTask(requestId, result)` is called or rejects when `rejectClientTask(requestId, error)` is called or when the request times out.

#### Scenario: Outbound client_task frame

- **WHEN** `requestFromClient` is called with a WebSocket, action `OPEN:CAMERA`, and input `{ target: 'camera' }`
- **THEN** the WebSocket receives a JSON text frame with `type: 'client_task'`, a non-empty `requestId`, `action: 'OPEN:CAMERA'`, and `input: { target: 'camera' }`

#### Scenario: Resolve completes pending request

- **WHEN** `requestFromClient` is in flight and `resolveClientTask(requestId, result)` is called with the matching `requestId`
- **THEN** the returned Promise resolves with `result`

#### Scenario: Reject completes pending request with error

- **WHEN** `requestFromClient` is in flight and `rejectClientTask(requestId, error)` is called with the matching `requestId`
- **THEN** the returned Promise rejects with an error carrying `error`

### Requirement: Client task timeout

The broker SHALL define a named constant `CLIENT_TASK_TIMEOUT_MS` equal to `10000`. Pending requests SHALL reject if no resolve or reject arrives within that duration. On timeout, the pending entry SHALL be removed from the internal map before rejecting.

#### Scenario: Timeout rejects and cleans up

- **WHEN** a client task request exceeds `CLIENT_TASK_TIMEOUT_MS` without a response
- **THEN** the Promise rejects with a timeout error
- **AND** a subsequent `resolveClientTask` for the same `requestId` is a no-op

### Requirement: Unknown requestId is a no-op

`resolveClientTask` and `rejectClientTask` SHALL look up the `requestId` in an internal module-level `Map`. If the entry is missing (unknown, already resolved, or timed out), the call SHALL return without throwing.

#### Scenario: Late resolve after timeout

- **WHEN** a request has already timed out and been removed from the map
- **AND** `resolveClientTask(requestId, result)` is called
- **THEN** no Promise is resolved and no error is thrown

### Requirement: Client task broker unit tests

The change SHALL include Jest unit tests for `client-task-broker.ts` covering outbound frame shape, resolve/reject completion, timeout with map cleanup, and no-op behavior for unknown request IDs.

#### Scenario: Tests under tests/websocket/

- **WHEN** the broker test suite is listed
- **THEN** test files reside under `tests/websocket/` and are discovered by `npm test`
