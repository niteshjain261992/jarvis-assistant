# conversation-summary Specification

## Purpose

Define event-driven rolling conversation summaries: Agenda job enqueue after completed message exchanges, Ollama summarization, and persistence to `conversations.summary`.

## Requirements

### Requirement: Agenda job infrastructure

The system SHALL use the `agenda` library with the existing MongoDB connection as the job store. Agenda SHALL start during server bootstrap and stop gracefully on shutdown. Jobs SHALL be defined in a dedicated module and registered before the HTTP server accepts traffic.

#### Scenario: Agenda starts with server

- **WHEN** `src/server.ts` completes MongoDB connect
- **THEN** Agenda is initialized and job definitions are registered

#### Scenario: Graceful shutdown

- **WHEN** the server receives `SIGTERM` or `SIGINT`
- **THEN** Agenda stops processing before MongoDB disconnect

### Requirement: Enqueue summary job after completed exchange

After the message pipeline produces a `status: 'completed'` result, the system SHALL enqueue an `update-conversation-summary` Agenda job **before** sending the `POST /messages` HTTP response. The job payload SHALL include `conversationId`, `userText`, and `assistantText` formatted as:

```
user: {user prompt}
assistant: {assistant response text}
```

For `type: 'action'` responses, `assistantText` SHALL be a concise string representation (e.g. action name and payload/result). Failed exchanges (`status: 'failed'`) and LLM errors SHALL NOT enqueue a summary job. A debug log SHALL be emitted when the job is enqueued (see `message-pipeline-logging`).

#### Scenario: Job enqueued on text completion

- **WHEN** `POST /messages` completes with `type: 'text'` and `status: 'completed'`
- **THEN** an `update-conversation-summary` job is scheduled with the conversation id and exchange text before the response is sent

#### Scenario: Job enqueued on action completion

- **WHEN** `POST /messages` completes with `type: 'action'` and `status: 'completed'`
- **THEN** an `update-conversation-summary` job is scheduled with a string representation of the action outcome

#### Scenario: No job on failure

- **WHEN** `POST /messages` returns `MESSAGE_FAILED` or an `LLM_*` error
- **THEN** no summary job is enqueued

### Requirement: First-exchange summary

When the job runs and the conversation has no existing `summary`, the worker SHALL call Ollama to summarize the job's exchange text and SHALL persist the result via `updateConversation(id, { summary })`.

#### Scenario: Initial summary created

- **WHEN** `update-conversation-summary` runs for a conversation with no `summary`
- **THEN** `conversation.summary` is set to a non-empty summarized string

### Requirement: Rolling summary update

When the job runs and the conversation already has a `summary`, the worker SHALL load the existing summary, combine it with the current exchange text, call Ollama to produce an updated summary, and SHALL replace `conversation.summary` with the new value. A debug log SHALL be emitted when the summary is persisted.

#### Scenario: Summary replaced on subsequent exchange

- **WHEN** `update-conversation-summary` runs for a conversation that already has a `summary`
- **THEN** `conversation.summary` is replaced with a summary that incorporates the prior summary and the new exchange

### Requirement: Summary failures do not affect HTTP responses

Summary generation and persistence failures in the Agenda worker SHALL be logged and SHALL NOT affect already-sent `POST /messages` responses or message pipeline state.

#### Scenario: Worker error is isolated

- **WHEN** Ollama is unavailable during summary job execution
- **THEN** the error is logged and the job completes or retries per Agenda config without changing the HTTP response the client already received
