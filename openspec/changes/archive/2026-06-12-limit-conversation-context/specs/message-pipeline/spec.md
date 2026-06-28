## MODIFIED Requirements

### Requirement: Conversation branch

When intent is `conversation`, the system SHALL call the main model with bounded conversation context: the conversation's rolling `summary` (when present) plus the last 10 prior completed messages (see `conversation-context` capability), then the current user prompt. The system SHALL update the assistant row to `type: 'text'`, set `content` to the model response, `status: 'completed'`, and include `model` when available.

#### Scenario: Text response returned

- **WHEN** intent is `conversation` and the main model succeeds
- **THEN** `POST /messages` responds with `type: 'text'` and non-empty `content`

#### Scenario: Summary included in LLM context

- **WHEN** intent is `conversation` and the active conversation has a `summary`
- **THEN** `generateConversationResponse` receives the summary and recent messages before producing the reply

#### Scenario: Context bounded to recent messages

- **WHEN** intent is `conversation` and the conversation has more than 10 prior message rows
- **THEN** only the 10 most recent prior messages are passed to the main model
