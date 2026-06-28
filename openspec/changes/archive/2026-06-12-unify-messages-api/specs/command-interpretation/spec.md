## MODIFIED Requirements

### Requirement: Command interpretation endpoint

The system SHALL interpret natural-language prompts into structured `ACTION:TARGET` commands via the configured Ollama model as the **action branch** of the synchronous `POST /messages` pipeline (after intent classification returns `action`). Command results SHALL be persisted on the assistant message row as `type: 'action'` with `actionName`, `actionExecutor`, and `actionPayload`, and exposed in the `POST /messages` response with envelope code `MESSAGE_COMPLETED`. Polling via `GET /messages/:messageId` SHALL NOT be used.

#### Scenario: Open camera intent via message pipeline

- **WHEN** a client submits `{ "prompt": "open camera" }` to `POST /messages` and intent is `action`
- **THEN** the response contains `data.type: "action"`, `data.actionName` matching the catalog command (e.g. `OPEN:CAMERA`), and `data.actionExecutor`

#### Scenario: Invalid request body

- **WHEN** a client sends `POST /messages` with a missing, empty, or non-string `prompt`
- **THEN** the response is HTTP 400 with the error envelope (`code: "BAD_REQUEST"`, `data: {}`) describing the validation failure
