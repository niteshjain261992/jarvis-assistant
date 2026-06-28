## ADDED Requirements

### Requirement: Location update controller behavior

`handleLocationUpdate` in `location-update.controller.ts` SHALL invoke `processLocationUpdate` with the parsed envelope. On success it SHALL NOT send an outbound WebSocket frame. Operational `AppError` instances SHALL map to `envelopeFromAppError`; unexpected errors SHALL map to `internalServerErrorEnvelope`.

#### Scenario: Successful update is silent

- **WHEN** `processLocationUpdate` completes without error
- **THEN** no outbound frame is sent on the WebSocket

#### Scenario: Operational error preserved

- **WHEN** `processLocationUpdate` throws an operational `AppError`
- **THEN** the controller sends the corresponding error `code` without closing the WebSocket

## MODIFIED Requirements

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

#### Scenario: LOCATION_UPDATE routed to location-update controller

- **WHEN** a valid `LOCATION_UPDATE` envelope is received
- **THEN** `handleLocationUpdate` in `location-update.controller.ts` is invoked
- **AND** the gateway does not call location persistence directly

#### Scenario: Gateway remains thin

- **WHEN** inspecting `messages.gateway.ts` after the change
- **THEN** it contains JSON parsing, envelope validation, controller lookup, and error envelope sending only
- **AND** it does not contain prompt, action-ack, or location-update business logic inline

### Requirement: WebSocket controller unit tests

The change SHALL include Jest unit tests for each controller under `tests/controllers/websocket/`, mocking `createMessage`, broker functions, and `processLocationUpdate`. Gateway tests SHALL cover envelope-shaped frames for all registered types.

#### Scenario: Controller tests discovered by Jest

- **WHEN** `npm test` runs
- **THEN** tests under `tests/controllers/websocket/` execute and cover success and error paths for all controllers including location update
