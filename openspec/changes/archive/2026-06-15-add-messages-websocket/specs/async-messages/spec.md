## ADDED Requirements

### Requirement: WebSocket message submission

In addition to `POST /messages`, the system SHALL accept message prompts over an established WebSocket connection using the protocol defined in the `websocket-messages` capability. Validation rules and pipeline behavior SHALL match the REST endpoint.

#### Scenario: Equivalent pipeline for WebSocket and REST

- **WHEN** a client submits the same valid `prompt` via WebSocket and via `POST /messages`
- **THEN** both transports invoke the same message pipeline and produce equivalent `data` payloads for the same conversation state

#### Scenario: REST endpoint unchanged

- **WHEN** a client sends `POST /messages` after WebSocket support is added
- **THEN** the HTTP behavior, status codes, and envelope responses remain as specified for REST
