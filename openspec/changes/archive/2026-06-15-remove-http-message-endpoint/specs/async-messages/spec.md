## REMOVED Requirements

### Requirement: Submit message with immediate acknowledgment

**Reason**: Message submission is WebSocket-only; the REST `POST /messages` endpoint is removed.

**Migration**: Clients must connect via WebSocket (`ws://host:PORT`) and send JSON text frames `{ "prompt": string }`. Responses use the same `{ code, message, data }` envelope as before (`MESSAGE_COMPLETED`, `MESSAGE_FAILED`, or error codes).

## MODIFIED Requirements

### Requirement: WebSocket message submission

The system SHALL accept message prompts only over an established WebSocket connection using the protocol defined in the `websocket-messages` capability. There is no REST message endpoint.

#### Scenario: WebSocket is the sole message transport

- **WHEN** a client submits a valid `prompt` via WebSocket
- **THEN** the message pipeline runs via `createMessage` and the server responds on the same connection with a JSON envelope

#### Scenario: REST message endpoint absent

- **WHEN** a client sends `POST /messages`
- **THEN** the response is HTTP 404 with `code: "NOT_FOUND"`
