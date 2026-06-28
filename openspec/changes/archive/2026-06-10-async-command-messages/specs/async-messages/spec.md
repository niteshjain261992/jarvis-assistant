# async-messages Delta Specification

## ADDED Requirements

### Requirement: Submit message with immediate acknowledgment

The system SHALL expose `POST /messages` accepting `{ "prompt": string }` (same validation as the former `/command`: trimmed, non-empty, max 500 characters). The handler SHALL create a persisted message record, generate a personalized Jarvis acknowledgment synchronously (ack strategy A), return HTTP 200 with envelope code `MESSAGE_ACCEPTED` and `data: { messageId: string, text: string }`, and SHALL start background command interpretation without blocking the client beyond acknowledgment generation.

#### Scenario: Message accepted with acknowledgment

- **WHEN** a client sends `POST /messages` with `{ "prompt": "open camera" }` and Ollama is available for acknowledgment
- **THEN** the response is HTTP 200 with `code: "MESSAGE_ACCEPTED"`, a non-empty `data.messageId`, and non-empty `data.text`

#### Scenario: Invalid request body

- **WHEN** a client sends `POST /messages` with an invalid `prompt`
- **THEN** the response is HTTP 400 with `code: "BAD_REQUEST"` and `data: {}`

#### Scenario: Acknowledgment failure

- **WHEN** acknowledgment generation fails (LLM unavailable)
- **THEN** the response is HTTP 502 with the appropriate `LLM_*` error code and no pollable `messageId` is returned to the client

### Requirement: Poll message by ID

The system SHALL expose `GET /messages/:messageId` returning the persisted message state. While command interpretation is in progress the envelope code SHALL be `MESSAGE_PROCESSING`; on success `MESSAGE_COMPLETED` with `data.command` and `data.model`; on failure `MESSAGE_FAILED` with `data.errorCode`. Unknown IDs SHALL return HTTP 404.

#### Scenario: Poll while processing

- **WHEN** a client polls `GET /messages/:messageId` before background interpretation completes
- **THEN** the response includes `code: "MESSAGE_PROCESSING"`, `data.status: "processing"`, and `data.text` from the acknowledgment

#### Scenario: Poll when completed

- **WHEN** background interpretation succeeds and the client polls the message
- **THEN** the response includes `code: "MESSAGE_COMPLETED"`, `data.status: "completed"`, `data.command`, and `data.model`

#### Scenario: Poll when failed

- **WHEN** background interpretation fails and the client polls the message
- **THEN** the response includes `code: "MESSAGE_FAILED"`, `data.status: "failed"`, and `data.errorCode`

#### Scenario: Unknown message ID

- **WHEN** a client polls a `messageId` that does not exist
- **THEN** the response is HTTP 404 with `code: "NOT_FOUND"`

### Requirement: MongoDB persistence

Each message SHALL be stored in MongoDB (collection `messages`) with at minimum: string `messageId` (document key), `prompt`, `ackText`, `status`, timestamps, and optional `command`, `model`, `errorCode` fields updated as processing progresses.

#### Scenario: Message survives poll

- **WHEN** a message is created via `POST /messages`
- **THEN** subsequent `GET /messages/:messageId` reads the same record from MongoDB
