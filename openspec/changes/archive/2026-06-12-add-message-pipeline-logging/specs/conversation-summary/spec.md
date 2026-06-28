## MODIFIED Requirements

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

### Requirement: Rolling summary update

When the job runs and the conversation already has a `summary`, the worker SHALL load the existing summary, combine it with the current exchange text, call Ollama to produce an updated summary, and SHALL replace `conversation.summary` with the new value. A debug log SHALL be emitted when the summary is persisted.

#### Scenario: Summary replaced on subsequent exchange

- **WHEN** `update-conversation-summary` runs for a conversation that already has a `summary`
- **THEN** `conversation.summary` is replaced with a summary that incorporates the prior summary and the new exchange
