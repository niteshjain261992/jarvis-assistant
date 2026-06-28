## ADDED Requirements

### Requirement: Type-based WebSocket controller dispatch

`src/websocket/messages.gateway.ts` SHALL validate inbound frames with `inboundEnvelopeSchema`, then dispatch to a registered controller function keyed by `envelope.type`. Controller modules SHALL live under `src/controllers/websocket/`. Each controller SHALL accept a context containing the session `WebSocket` and the parsed envelope variant for its type.

#### Scenario: USER_PROMPT routed to user-prompt controller

- **WHEN** a valid `USER_PROMPT` envelope is received
- **THEN** `handleUserPrompt` in `user-prompt.controller.ts` is invoked
- **AND** the gateway does not call `createMessage` directly

#### Scenario: ACTION_ACK routed to action-ack controller

- **WHEN** a valid `ACTION_ACK` envelope is received
- **THEN** `handleActionAck` in `action-ack.controller.ts` is invoked
- **AND** the gateway does not call broker resolve/reject directly

#### Scenario: Gateway remains thin

- **WHEN** inspecting `messages.gateway.ts` after the change
- **THEN** it contains JSON parsing, envelope validation, controller lookup, and error envelope sending only
- **AND** it does not contain prompt or action-ack business logic inline

### Requirement: User prompt controller behavior

`handleUserPrompt` SHALL extract `payload.text` from the envelope, invoke `createMessage(text, ws)`, and send the resulting outbound `{ code, message, data }` envelope on the WebSocket. Operational `AppError` instances SHALL map to `envelopeFromAppError`; unexpected errors SHALL map to `internalServerErrorEnvelope`. The controller SHALL log acceptance at debug level with prompt length (same semantics as current gateway).

#### Scenario: Completed message sends MESSAGE_COMPLETED

- **WHEN** `createMessage` resolves with a completed result
- **THEN** the controller sends a frame with `code: "MESSAGE_COMPLETED"`

#### Scenario: Pipeline failure sends MESSAGE_FAILED

- **WHEN** `createMessage` resolves with `status: 'failed'`
- **THEN** the controller sends a frame with `code: "MESSAGE_FAILED"`

#### Scenario: Operational error preserved

- **WHEN** `createMessage` throws an operational `AppError`
- **THEN** the controller sends the corresponding error `code` without closing the WebSocket

### Requirement: Action acknowledgment controller behavior

`handleActionAck` SHALL map the ACK payload to client-task broker calls. When `payload.status` is `"SUCCESS"`, it SHALL call `resolveClientTask(payload.original_server_message_id, payload)`. When `payload.status` is `"FAILURE"`, it SHALL call `rejectClientTask(payload.original_server_message_id, payload.error_details)`. The controller SHALL NOT send an outbound WebSocket frame on success.

#### Scenario: SUCCESS resolves broker

- **WHEN** an `ACTION_ACK` envelope with `status: "SUCCESS"` is handled
- **THEN** `resolveClientTask` is called with `original_server_message_id` as the request id
- **AND** no outbound frame is sent

#### Scenario: FAILURE rejects broker

- **WHEN** an `ACTION_ACK` envelope with `status: "FAILURE"` and `error_details: "Playback failed"` is handled
- **THEN** `rejectClientTask` is called with the server message id and error string
- **AND** no outbound frame is sent

### Requirement: WebSocket controller unit tests

The change SHALL include Jest unit tests for each controller under `tests/controllers/websocket/`, mocking `createMessage` and broker functions. Gateway tests SHALL be updated to send envelope-shaped frames.

#### Scenario: Controller tests discovered by Jest

- **WHEN** `npm test` runs
- **THEN** tests under `tests/controllers/websocket/` execute and cover success and error paths for both controllers
