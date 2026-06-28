# message-pipeline-logging Specification

## Purpose

Define structured debug logging for the WebSocket message pipeline and related background summary work so developers can trace agent turns, LLM calls, and summary updates.

## Requirements

### Requirement: Request-scoped pipeline trace

The WebSocket message flow SHALL emit structured `debug`-level log entries at defined checkpoints from request acceptance through response. Each log entry after conversation resolution SHALL include `conversationId` for correlation.

#### Scenario: Request accepted

- **WHEN** `handleRawMessage` receives a valid `{ prompt }` frame
- **THEN** a debug log is emitted with `promptLength` (not the full prompt text)

#### Scenario: Conversation resolved

- **WHEN** `createMessage` obtains or creates an active conversation
- **THEN** a debug log is emitted with `conversationId` and whether the conversation was reused or newly created

#### Scenario: Messages persisted

- **WHEN** user and assistant message rows are inserted
- **THEN** a debug log is emitted with `conversationId`, `userMessageId`, and `assistantMessageId`

### Requirement: Intent and branch logging

After the agent turn starts, the pipeline SHALL log the agent outcome kind and relevant context counts.

#### Scenario: Agent turn entered

- **WHEN** `runAgentTurn` begins processing
- **THEN** a debug log is emitted with `conversationId`, `contextMessageCount`, and whether a conversation summary is present

#### Scenario: Agent turn completed

- **WHEN** `runAgent` returns and the assistant row is updated
- **THEN** a debug log is emitted with `conversationId`, `agentKind` (`text` or `clarify`), and resulting assistant `type`

#### Scenario: Pipeline completed

- **WHEN** `createMessage` returns a completed or failed result
- **THEN** a debug log is emitted with `conversationId`, `type`, and `status`

### Requirement: LLM operation logging

Ollama calls used directly by the message pipeline background work (`summarizeText`) SHALL emit debug logs before and after the HTTP request with `llmOperation` and `durationMs`. Logs SHALL NOT include full prompt or model response text. Agent-runner LLM calls MAY be logged separately in a future change.

#### Scenario: LLM call completed

- **WHEN** an Ollama generate call for conversation summarization succeeds
- **THEN** a debug log is emitted with `llmOperation` and `durationMs`

### Requirement: Summary job logging

The conversation-summary flow SHALL emit debug logs when a summary job is enqueued and when a summary is persisted.

#### Scenario: Summary job enqueued

- **WHEN** `enqueueConversationSummary` schedules an Agenda job for a completed exchange
- **THEN** a debug log is emitted with `conversationId` and `summaryJob: 'enqueued'`

#### Scenario: Summary persisted

- **WHEN** `processSummaryJob` successfully updates `conversation.summary`
- **THEN** a debug log is emitted with `conversationId`, `summaryJob: 'persisted'`, and whether it was a first summary or rolling update

### Requirement: Pipeline failure error logging

When `createMessage` or its internal helpers encounter an unexpected error that causes the pipeline to throw or abort, the system SHALL emit a structured `error`-level log entry before the error propagates. Each entry SHALL include `{ err }` (the underlying error when available), `conversationId`, and `pipelineStage` identifying where the failure occurred. When message IDs are assigned, logs SHALL also include `userMessageId` and `assistantMessageId`. Logs SHALL NOT include full user prompt text.

#### Scenario: Pipeline exception logged before rethrow

- **WHEN** an error is caught by the outer `createMessage` catch block after assistant message IDs are assigned
- **THEN** an error log is emitted with `{ err }`, `conversationId`, `userMessageId`, `assistantMessageId`, and `pipelineStage: 'pipeline'`
- **AND** the error is still re-thrown after the assistant row is marked failed

#### Scenario: Failed assistant update logged

- **WHEN** marking the assistant message as failed throws during the outer catch recovery
- **THEN** an error log is emitted with `{ err }`, `conversationId`, `userMessageId`, `assistantMessageId`, and `pipelineStage: 'markFailed'`
- **AND** the original pipeline error is still re-thrown

#### Scenario: Pre-pipeline persistence failure logged

- **WHEN** `getOrCreateActiveConversation` or message insert before the agent turn throws
- **THEN** an error log is emitted with `{ err }`, `pipelineStage` (`conversationResolve`, `messageInsert`, or `conversationUpdate` as appropriate), and any IDs already assigned (`conversationId`, `userMessageId`, `assistantMessageId`)
