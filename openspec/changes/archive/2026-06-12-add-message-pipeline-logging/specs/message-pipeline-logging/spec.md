# message-pipeline-logging Specification

## Purpose

Define structured debug logging for the `POST /messages` pipeline and related background summary work so developers can trace intent classification, LLM calls, branch routing, and summary updates.

## ADDED Requirements

### Requirement: Request-scoped pipeline trace

The `POST /messages` flow SHALL emit structured `debug`-level log entries at defined checkpoints from request acceptance through response. Each log entry after conversation resolution SHALL include `conversationId` for correlation.

#### Scenario: Request accepted

- **WHEN** `postMessage` receives a valid `{ prompt }` body
- **THEN** a debug log is emitted with `promptLength` (not the full prompt text)

#### Scenario: Conversation resolved

- **WHEN** `createMessage` obtains or creates an active conversation
- **THEN** a debug log is emitted with `conversationId` and whether the conversation was reused or newly created

#### Scenario: Messages persisted

- **WHEN** user and assistant message rows are inserted
- **THEN** a debug log is emitted with `conversationId`, `userMessageId`, and `assistantMessageId`

### Requirement: Intent and branch logging

After intent classification, the pipeline SHALL log the resolved intent and the branch entered.

#### Scenario: Intent classified

- **WHEN** `classifyIntent` returns
- **THEN** a debug log is emitted with `conversationId` and `intent` (`conversation`, `action`, or `image`)

#### Scenario: Branch entered

- **WHEN** the pipeline enters the conversation, action, or image branch
- **THEN** a debug log is emitted with `conversationId`, `intent`, and `branch`

#### Scenario: Pipeline completed

- **WHEN** `createMessage` returns a completed or failed result
- **THEN** a debug log is emitted with `conversationId`, `type`, and `status`

### Requirement: LLM operation logging

Each Ollama call used by the message pipeline (`classifyIntent`, `generateConversationResponse`, `interpretCommand`, `summarizeText`) SHALL emit debug logs before and after the HTTP request with `llmOperation` and `durationMs`. Logs SHALL NOT include full prompt or model response text.

#### Scenario: LLM call completed

- **WHEN** an Ollama generate call succeeds
- **THEN** a debug log is emitted with `llmOperation` and `durationMs`

#### Scenario: Action command resolved

- **WHEN** the action branch completes command interpretation
- **THEN** a debug log is emitted with `conversationId`, `actionName`, and `actionExecutor`

### Requirement: Summary job logging

The conversation-summary flow SHALL emit debug logs when a summary job is enqueued and when a summary is persisted.

#### Scenario: Summary job enqueued

- **WHEN** `enqueueConversationSummary` schedules an Agenda job for a completed exchange
- **THEN** a debug log is emitted with `conversationId` and `summaryJob: 'enqueued'`

#### Scenario: Summary persisted

- **WHEN** `processSummaryJob` successfully updates `conversation.summary`
- **THEN** a debug log is emitted with `conversationId`, `summaryJob: 'persisted'`, and whether it was a first summary or rolling update
