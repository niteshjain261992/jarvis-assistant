# conversation-context Specification

## Purpose

Define bounded LLM input for the conversation branch: recent message history plus rolling conversation summary.

## Requirements

### Requirement: Bounded recent message history

When building LLM input for the conversation branch, the system SHALL load at most the 10 most recent messages for the conversation, ordered chronologically by `sequenceNumber`. Messages from the current in-flight exchange (sequence numbers at or above the current user message) SHALL be excluded from history; the current user prompt is supplied separately.

#### Scenario: Last 10 prior messages loaded

- **WHEN** a conversation has more than 10 completed message pairs before the current request
- **THEN** only the 10 messages with the highest `sequenceNumber` below the current user message are included in context

#### Scenario: Fewer than 10 prior messages

- **WHEN** a conversation has fewer than 10 prior completed messages
- **THEN** all available prior messages are included without error

#### Scenario: First message in conversation

- **WHEN** the current request is the first exchange (`userSequence` is 1)
- **THEN** message history is empty and only the current prompt is sent to the LLM

### Requirement: Summary combined with recent history

When `conversation.summary` is present, the system SHALL include it in the LLM prompt before recent message history. When `summary` is absent or empty, the system SHALL omit the summary section and use recent messages only.

#### Scenario: Summary and history combined

- **WHEN** intent is `conversation`, the conversation has a non-empty `summary`, and prior messages exist
- **THEN** the LLM prompt includes a summary section followed by recent message history and the current user prompt

#### Scenario: No summary yet

- **WHEN** intent is `conversation` and `conversation.summary` is undefined or empty
- **THEN** the LLM prompt is built from recent message history and the current user prompt only

### Requirement: Completed messages only in history

Recent message history sent to the LLM SHALL include only messages with `status: 'completed'` and non-empty `content`, formatted as `role: content` lines.

#### Scenario: Processing assistant excluded

- **WHEN** the current exchange has an assistant row in `processing` status
- **THEN** that row is not included in the history block sent to the LLM
