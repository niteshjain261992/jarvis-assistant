# command-interpretation Delta Specification

## MODIFIED Requirements

### Requirement: Command interpretation endpoint

The system SHALL interpret natural-language prompts into structured `ACTION:TARGET` commands via the configured Ollama model as a **background step** of the async message pipeline (`POST /messages` → poll `GET /messages/:messageId`). The standalone `POST /command` endpoint SHALL be removed. Completed messages SHALL expose the result in the poll response as `data.command` and `data.model` with envelope code `MESSAGE_COMPLETED`.

#### Scenario: Open camera intent via message pipeline

- **WHEN** a client submits `{ "prompt": "open camera" }` to `POST /messages`, waits for acknowledgment, then polls until `status` is `completed`
- **THEN** the final poll response contains `data.command: "OPEN:CAMERA"`

#### Scenario: Invalid request body

- **WHEN** a client sends `POST /messages` with a missing, empty, or non-string `prompt`
- **THEN** the response is HTTP 400 with the error envelope (`code: "BAD_REQUEST"`, `data: {}`) describing the validation failure

## REMOVED Requirements

### Requirement: Command interpretation endpoint (standalone synchronous)

**Reason**: Replaced by async message pipeline; clients poll for `data.command` instead of blocking on `POST /command`.

**Migration**: Use `POST /messages` then `GET /messages/:messageId` until `MESSAGE_COMPLETED`.
