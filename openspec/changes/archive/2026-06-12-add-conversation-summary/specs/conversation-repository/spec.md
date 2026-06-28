## ADDED Requirements

### Requirement: Summary field maintained by background worker

The `summary` field on conversation documents SHALL be updated asynchronously by the conversation-summary Agenda worker. The repository `updateConversation` partial update for `summary` SHALL be used by the worker to persist rolling summaries.

#### Scenario: Summary persisted via repository

- **WHEN** the summary worker completes summarization for a conversation
- **THEN** `updateConversation` is called with `{ summary }` and `updatedAt` is refreshed
