## MODIFIED Requirements

### Requirement: Client task timeout

The broker SHALL define a named constant `CLIENT_TASK_TIMEOUT_MS` equal to `10000` as the default client wait duration. `requestFromClient` SHALL accept an optional fifth argument `timeoutMs?: number`. When `timeoutMs` is provided, the broker SHALL use it as the effective timeout; otherwise it SHALL use `CLIENT_TASK_TIMEOUT_MS`. Pending requests SHALL reject if no resolve or reject arrives within the effective timeout. On timeout, the pending entry SHALL be removed from the internal map before rejecting. Timeout rejection messages and persisted `errorDetails` SHALL reference the effective timeout duration in milliseconds.

#### Scenario: Default timeout rejects and cleans up

- **WHEN** a client task request is made without a `timeoutMs` argument and exceeds `CLIENT_TASK_TIMEOUT_MS` without a response
- **THEN** the Promise rejects with a timeout error referencing `CLIENT_TASK_TIMEOUT_MS`
- **AND** a subsequent `resolveClientTask` for the same `requestId` is a no-op

#### Scenario: Custom timeout rejects at configured duration

- **WHEN** `requestFromClient` is called with `timeoutMs: 5000`
- **AND** no response arrives within 5000 ms
- **THEN** the Promise rejects with a timeout error referencing `5000`
- **AND** the pending entry is removed from the internal map

#### Scenario: Custom timeout allows longer wait

- **WHEN** `requestFromClient` is called with `timeoutMs: 30000`
- **AND** `resolveClientTask` is called after 15000 ms
- **THEN** the Promise resolves with the client result
- **AND** no timeout rejection occurs

### Requirement: Client task message persistence on terminal states

When a client task request was created with `ClientTaskPersistenceContext`, `resolveClientTask` SHALL update the correlated **action** message row (identified by `requestId`) to `status: 'completed'` and persist `actionResult`. `rejectClientTask` and the broker timeout handler SHALL update the correlated action message row to `status: 'failed'` with `errorDetails`. Persistence errors SHALL be logged and SHALL NOT prevent in-memory promise resolution or rejection.

#### Scenario: Timeout marks message failed

- **WHEN** a client task request with persistence context exceeds its effective timeout without a response
- **THEN** the correlated action message row is updated to `status: 'failed'` with timeout `errorDetails` referencing the effective timeout duration
- **AND** the Promise rejects with a timeout error

#### Scenario: Unknown requestId skips persistence

- **WHEN** `resolveClientTask` or `rejectClientTask` is called for a `requestId` not in the pending map
- **THEN** no message row is updated and no error is thrown

### Requirement: Client task broker unit tests

The change SHALL include Jest unit tests for `client-task-broker.ts` covering outbound frame shape, resolve/reject completion, timeout with map cleanup (default and custom `timeoutMs`), no-op behavior for unknown request IDs, and message persistence on pending, completed, and failed transitions when context is provided.

#### Scenario: Tests under tests/websocket/

- **WHEN** the broker test suite is listed
- **THEN** test files reside under `tests/websocket/` and are discovered by `npm test`
