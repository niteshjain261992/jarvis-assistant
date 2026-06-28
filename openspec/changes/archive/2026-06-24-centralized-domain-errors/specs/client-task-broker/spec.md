## MODIFIED Requirements

### Requirement: Client task timeout

The broker SHALL define a named constant `CLIENT_TASK_TIMEOUT_MS` equal to `10000` as the default client wait duration. `requestFromClient` SHALL accept an optional fifth argument `timeoutMs?: number`. When `timeoutMs` is provided, the broker SHALL use it as the effective timeout; otherwise it SHALL use `CLIENT_TASK_TIMEOUT_MS`. Pending requests SHALL reject if no resolve or reject arrives within the effective timeout. On timeout, the pending entry SHALL be removed from the internal map before rejecting. Timeout rejection SHALL throw (reject with) a `JarvisError` with `type: 'CLIENT_TIMEOUT'` whose message and persisted `errorDetails` reference the effective timeout duration in milliseconds.

#### Scenario: Default timeout rejects and cleans up

- **WHEN** a client task request is made without a `timeoutMs` argument and exceeds `CLIENT_TASK_TIMEOUT_MS` without a response
- **THEN** the Promise rejects with a `JarvisError` with `type === 'CLIENT_TIMEOUT'` referencing `CLIENT_TASK_TIMEOUT_MS`
- **AND** a subsequent `resolveClientTask` for the same `requestId` is a no-op

#### Scenario: Custom timeout rejects at configured duration

- **WHEN** `requestFromClient` is called with `timeoutMs: 5000`
- **AND** no response arrives within 5000 ms
- **THEN** the Promise rejects with a `JarvisError` with `type === 'CLIENT_TIMEOUT'` referencing `5000`
- **AND** the pending entry is removed from the internal map

#### Scenario: Custom timeout allows longer wait

- **WHEN** `requestFromClient` is called with `timeoutMs: 30000`
- **AND** the client responds within 30000 ms
- **THEN** the Promise resolves with the client result
- **AND** no timeout rejection occurs

### Requirement: Client task rejection

When `rejectClientTask(requestId, error)` is called for a pending request, the broker SHALL reject the associated Promise with a `JarvisError` with `type: 'CLIENT_ERROR'` and message equal to the provided `error` string.

#### Scenario: Reject completes pending request with typed client error

- **WHEN** `requestFromClient` is in flight and `rejectClientTask(requestId, 'Playback failed')` is called with the matching `requestId`
- **THEN** the returned Promise rejects with a `JarvisError` with `type === 'CLIENT_ERROR'` and message `'Playback failed'`
- **AND** when the request was created with persistence context, the action message row with `_id` equal to `requestId` is updated to `status: 'failed'` with `errorDetails` set to `'Playback failed'`
