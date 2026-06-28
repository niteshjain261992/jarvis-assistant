## MODIFIED Requirements

### Requirement: Synchronous single response

`POST /messages` SHALL return the final assistant outcome in one HTTP response. No poll endpoint is required. For completed exchanges, the pipeline SHALL enqueue a background conversation-summary job before returning the response. The pipeline SHALL emit structured debug logs at key checkpoints (see `message-pipeline-logging` capability).

#### Scenario: Completed assistant in POST response

- **WHEN** the pipeline succeeds
- **THEN** the response is HTTP 200 with envelope code `MESSAGE_COMPLETED` and `data` containing `conversationId`, assistant `type`, `status`, and the appropriate content or action fields

#### Scenario: Summary job scheduled before response

- **WHEN** the pipeline succeeds with `status: 'completed'`
- **THEN** an `update-conversation-summary` Agenda job is enqueued before the HTTP response is sent

#### Scenario: Pipeline debug trace

- **WHEN** `LOG_LEVEL` is `debug` and a valid `POST /messages` request is processed
- **THEN** debug logs are emitted for conversation resolution, message insert, intent classification, and pipeline completion

#### Scenario: Pipeline failure

- **WHEN** intent or main model fails
- **THEN** the assistant row is marked `failed` with `errorDetails` and the response uses `MESSAGE_FAILED` or an appropriate `LLM_*` error
