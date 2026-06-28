## MODIFIED Requirements

### Requirement: Client task request correlation

The system SHALL provide `requestFromClient(ws: WebSocket, action: string, input: Record<string, unknown>, timeoutMs?: number): Promise<unknown>` in `src/websocket/client-task-broker.ts`. The function SHALL generate a unique `requestId` via `crypto.randomUUID()` without database writes. It SHALL send a JSON text frame using the standard WebSocket `MessageEnvelope` shape (`{ code, message, data }`) produced by `actionRequestEnvelope` from `message-envelope.ts`, and return a Promise that resolves when `resolveClientTask(requestId, result)` is called or rejects when `rejectClientTask(requestId, error)` is called or when the request times out. The envelope `data` object SHALL have `type: 'action'`, `status: 'pending'`, `requestId`, `actionName` (from the `action` argument), `actionExecutor: 'client'`, and `actionPayload` (from the `input` argument). The broker SHALL NOT insert or update message rows — persistence is handled by `withToolPersistence` in the tool layer.

#### Scenario: Outbound action request envelope

- **WHEN** `requestFromClient` is called with a WebSocket, action `OPEN:CAMERA`, and input `{ target: 'camera' }`
- **THEN** the WebSocket receives a JSON text frame with top-level keys `code`, `message`, and `data`
- **AND** `data.type` is `'action'`
- **AND** `data.actionName` is `'OPEN:CAMERA'`
- **AND** `data.actionPayload` is `{ target: 'camera' }`
- **AND** `data.requestId` is a non-empty string
- **AND** `data.actionExecutor` is `'client'`

#### Scenario: Resolve completes pending request

- **WHEN** `requestFromClient` is in flight and `resolveClientTask(requestId, result)` is called with the matching `requestId`
- **THEN** the returned Promise resolves with `result`

#### Scenario: Reject completes pending request with error

- **WHEN** `requestFromClient` is in flight and `rejectClientTask(requestId, error)` is called with the matching `requestId`
- **THEN** the returned Promise rejects with a `JarvisError` with `type === 'CLIENT_ERROR'` and message equal to `error`

### Requirement: Client task timeout

The broker SHALL define a named constant `CLIENT_TASK_TIMEOUT_MS` equal to `10000` as the default client wait duration. `requestFromClient` SHALL accept an optional fourth argument `timeoutMs?: number`. When `timeoutMs` is provided, the broker SHALL use it as the effective timeout; otherwise it SHALL use `CLIENT_TASK_TIMEOUT_MS`. Pending requests SHALL reject if no resolve or reject arrives within the effective timeout. On timeout, the pending entry SHALL be removed from the internal map before rejecting. Timeout rejection SHALL throw (reject with) a `JarvisError` with `type: 'CLIENT_TIMEOUT'` whose message references the effective timeout duration in milliseconds. The broker SHALL NOT update message rows on timeout.

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

When `rejectClientTask(requestId, error)` is called for a pending request, the broker SHALL reject the associated Promise with a `JarvisError` with `type: 'CLIENT_ERROR'` and message equal to the provided `error` string. The broker SHALL NOT update message rows.

#### Scenario: Reject completes pending request with typed client error

- **WHEN** `requestFromClient` is in flight and `rejectClientTask(requestId, 'Playback failed')` is called with the matching `requestId`
- **THEN** the returned Promise rejects with a `JarvisError` with `type === 'CLIENT_ERROR'` and message `'Playback failed'`

### Requirement: Client task broker unit tests

The change SHALL include Jest unit tests for `client-task-broker.ts` covering outbound frame shape, resolve/reject completion, timeout with map cleanup (default and custom `timeoutMs`), and no-op behavior for unknown request IDs. Broker tests SHALL NOT assert message repository calls.

#### Scenario: Tests under tests/websocket/

- **WHEN** the broker test suite is listed
- **THEN** test files reside under `tests/websocket/` and are discovered by `npm test`

## REMOVED Requirements

### Requirement: Client task message persistence on terminal states

**Reason:** Action-row persistence moved to `withToolPersistence` in `src/agent/tools/tool-persistence.ts`; the broker handles WebSocket delegation only.

**Migration:** Client tools wrap `requestFromClient` with `withToolPersistence` when `ClientTaskPersistenceContext` is available. Server tools use the same wrapper around their execute function.
