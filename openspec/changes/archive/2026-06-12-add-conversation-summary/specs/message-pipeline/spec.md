## MODIFIED Requirements

### Requirement: Synchronous single response

`POST /messages` SHALL return the final assistant outcome in one HTTP response. No poll endpoint is required. For completed exchanges, the pipeline SHALL enqueue a background conversation-summary job before returning the response.

#### Scenario: Completed assistant in POST response

- **WHEN** the pipeline succeeds
- **THEN** the response is HTTP 200 with envelope code `MESSAGE_COMPLETED` and `data` containing `conversationId`, assistant `type`, `status`, and the appropriate content or action fields

#### Scenario: Summary job scheduled before response

- **WHEN** the pipeline succeeds with `status: 'completed'`
- **THEN** an `update-conversation-summary` Agenda job is enqueued before the HTTP response is sent

#### Scenario: Pipeline failure

- **WHEN** intent or main model fails
- **THEN** the assistant row is marked `failed` with `errorDetails` and the response uses `MESSAGE_FAILED` or an appropriate `LLM_*` error
