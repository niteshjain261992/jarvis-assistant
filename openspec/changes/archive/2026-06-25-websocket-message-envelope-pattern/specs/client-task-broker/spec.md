## ADDED Requirements

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
