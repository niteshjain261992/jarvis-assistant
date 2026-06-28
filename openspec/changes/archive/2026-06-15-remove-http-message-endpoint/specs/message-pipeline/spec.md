## MODIFIED Requirements

### Requirement: Dual message insert

For each valid prompt submitted over WebSocket, the system SHALL insert two message rows in order:

1. User message: `role: 'user'`, `type: 'text'`, `content: prompt`, `status: 'completed'`
2. Assistant placeholder: `role: 'assistant'`, `status: 'processing'`, `parentId` set to the user message `_id`

Both rows SHALL share the same `conversationId` and monotonic `sequenceNumber` values. The conversation `lastSequenceNumber` SHALL advance after the pipeline completes.

#### Scenario: User and assistant rows persisted

- **WHEN** a valid prompt is submitted over WebSocket
- **THEN** MongoDB contains both user and assistant documents linked by `parentId`

### Requirement: Conversation branch

When intent is `conversation`, the system SHALL call the main model with bounded conversation context: the conversation's rolling `summary` (when present) plus the last 10 prior completed messages (see `conversation-context` capability), then the current user prompt. The system SHALL update the assistant row to `type: 'text'`, set `content` to the model response, `status: 'completed'`, and include `model` when available.

#### Scenario: Text response returned

- **WHEN** intent is `conversation` and the main model succeeds
- **THEN** the WebSocket response envelope has `data.type: 'text'` and non-empty `data.content`

#### Scenario: Summary included in LLM context

- **WHEN** intent is `conversation` and the active conversation has a `summary`
- **THEN** `generateConversationResponse` receives the summary and recent messages before producing the reply

#### Scenario: Context bounded to recent messages

- **WHEN** intent is `conversation` and the conversation has more than 10 prior message rows
- **THEN** only the 10 most recent prior messages are passed to the main model

### Requirement: Synchronous single response

The message pipeline SHALL return the final assistant outcome in one WebSocket response frame per prompt. No poll endpoint is required. For completed exchanges, the pipeline SHALL enqueue a background conversation-summary job before sending the response. The pipeline SHALL emit structured debug logs at key checkpoints (see `message-pipeline-logging` capability).

#### Scenario: Completed assistant in WebSocket response

- **WHEN** the pipeline succeeds
- **THEN** the server sends a JSON frame with `code: "MESSAGE_COMPLETED"` and `data` containing `conversationId`, assistant `type`, `status`, and the appropriate content or action fields

#### Scenario: Summary job scheduled before response

- **WHEN** the pipeline succeeds with `status: 'completed'`
- **THEN** an `update-conversation-summary` Agenda job is enqueued before the WebSocket response frame is sent

#### Scenario: Pipeline debug trace

- **WHEN** `LOG_LEVEL` is `debug` and a valid WebSocket prompt is processed
- **THEN** debug logs are emitted for conversation resolution, message insert, intent classification, and pipeline completion

#### Scenario: Pipeline failure

- **WHEN** intent or main model fails
- **THEN** the assistant row is marked `failed` with `errorDetails` and the WebSocket response uses `MESSAGE_FAILED` or an appropriate `LLM_*` error code

### Requirement: Modular message service structure

The message pipeline service (`src/services/message.service.ts`) SHALL implement intent branches as separate private functions (`handleConversationBranch`, `handleActionBranch`, `handleImageBranch`) invoked from a thin `createMessage` orchestrator. Pipeline setup (conversation resolution and dual message insert) SHALL live in a dedicated private function. Thrown pipeline failures SHALL be recovered through a single centralized error-recovery helper.

#### Scenario: Conversation branch isolated

- **WHEN** intent is `conversation`
- **THEN** conversation-specific logic runs in `handleConversationBranch` (or equivalent private function), not inline in `createMessage`

#### Scenario: Action branch isolated

- **WHEN** intent is `action`
- **THEN** action-specific logic runs in `handleActionBranch` (or equivalent private function), not inline in `createMessage`

#### Scenario: Centralized thrown-error recovery

- **WHEN** conversation or action branch throws after messages are persisted
- **THEN** error logging, assistant row failure marking, and re-throw are handled by one shared recovery helper

#### Scenario: Behavior unchanged after transport removal

- **WHEN** any existing message-pipeline scenario is exercised via WebSocket after REST removal
- **THEN** WebSocket envelope responses, persistence side effects, and logging semantics match pre-removal behavior for the same prompts
