## MODIFIED Requirements

### Requirement: Submit message with immediate acknowledgment

The system SHALL expose `POST /messages` accepting `{ "prompt": string }` (trimmed, non-empty, max 500 characters). The handler SHALL run the synchronous message pipeline: resolve an active conversation, persist user and assistant message rows, classify intent, produce the final assistant message, and return HTTP 200 with envelope code `MESSAGE_COMPLETED` and `data` containing the completed assistant payload (`conversationId`, `type`, `status`, and `content` or action fields). The handler SHALL NOT return an interim acknowledgment or require polling.

#### Scenario: Message completed in single response

- **WHEN** a client sends `POST /messages` with `{ "prompt": "What is the capital of France?" }` and Ollama is available
- **THEN** the response is HTTP 200 with `code: "MESSAGE_COMPLETED"`, `data.conversationId`, `data.type: "text"`, `data.status: "completed"`, and non-empty `data.content`

#### Scenario: Invalid request body

- **WHEN** a client sends `POST /messages` with an invalid `prompt`
- **THEN** the response is HTTP 400 with `code: "BAD_REQUEST"` and `data: {}`

#### Scenario: LLM failure

- **WHEN** intent classification or the main model fails
- **THEN** the response is HTTP 502 with the appropriate `LLM_*` error code or HTTP 200 `MESSAGE_FAILED` with `errorDetails` when the assistant row was created

## REMOVED Requirements

### Requirement: Poll message by ID

**Reason**: Clients receive the final assistant message in the `POST /messages` response; polling is no longer needed.

**Migration**: Remove `GET /messages/:messageId` from clients. Use the synchronous `POST /messages` response only.

### Requirement: MongoDB persistence

**Reason**: Superseded by conversation-linked dual-message persistence in the message-pipeline capability.

**Migration**: Messages are stored as user/assistant rows per conversation with the restructured `MessageDocument` schema.
