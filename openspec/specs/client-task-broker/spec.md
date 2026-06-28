# client-task-broker Specification

## Purpose

Define in-memory request/response correlation for bidirectional client-task delegation over WebSocket, allowing server-side tool handlers to await real client execution outcomes.

## Requirements

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

### Requirement: Unknown requestId is a no-op

`resolveClientTask` and `rejectClientTask` SHALL look up the `requestId` in an internal module-level `Map`. If the entry is missing (unknown, already resolved, or timed out), the call SHALL return without throwing.

#### Scenario: Late resolve after timeout

- **WHEN** a request has already timed out and been removed from the map
- **AND** `resolveClientTask(requestId, result)` is called
- **THEN** no Promise is resolved and no error is thrown

### Requirement: ACTION_ACK integration path

Client-task completion SHALL be triggered exclusively by the `ACTION_ACK` inbound envelope handled in `action-ack.controller.ts`. The broker's public API (`resolveClientTask`, `rejectClientTask`, `requestFromClient`) SHALL remain unchanged. The controller SHALL pass `original_server_message_id` as the broker `requestId` lookup key.

#### Scenario: ACK success resolves pending request

- **WHEN** the server has an in-flight `requestFromClient` with `requestId` `"abc-123"`
- **AND** the client sends an `ACTION_ACK` with `payload.original_server_message_id: "abc-123"` and `status: "SUCCESS"`
- **THEN** the broker Promise resolves with the ACK payload object

#### Scenario: ACK failure rejects pending request

- **WHEN** the server has an in-flight `requestFromClient` with `requestId` `"abc-123"`
- **AND** the client sends an `ACTION_ACK` with `payload.original_server_message_id: "abc-123"`, `status: "FAILURE"`, and `error_details: "Playback failed"`
- **THEN** the broker Promise rejects with a `JarvisError` with `type === 'CLIENT_ERROR'` and message `'Playback failed'`

#### Scenario: Outbound action frame id matches ACK correlation field

- **WHEN** `requestFromClient` sends an outbound action envelope
- **THEN** `data.requestId` is the value the client MUST echo as `payload.original_server_message_id` in `ACTION_ACK`

### Requirement: Client task broker unit tests

The change SHALL include Jest unit tests for `client-task-broker.ts` covering outbound frame shape, resolve/reject completion, timeout with map cleanup (default and custom `timeoutMs`), and no-op behavior for unknown request IDs. Broker tests SHALL NOT assert message repository calls.

#### Scenario: Tests under tests/websocket/

- **WHEN** the broker test suite is listed
- **THEN** test files reside under `tests/websocket/` and are discovered by `npm test`
