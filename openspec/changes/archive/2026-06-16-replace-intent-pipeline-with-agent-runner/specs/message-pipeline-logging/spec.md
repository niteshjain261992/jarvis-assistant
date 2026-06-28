## MODIFIED Requirements

### Requirement: Intent and branch logging

After the agent turn starts, the pipeline SHALL log the agent outcome kind and relevant context counts.

#### Scenario: Agent turn entered

- **WHEN** `runAgentTurn` begins processing
- **THEN** a debug log is emitted with `conversationId`, `contextMessageCount`, and whether a conversation summary is present

#### Scenario: Agent turn completed

- **WHEN** `runAgent` returns and the assistant row is updated
- **THEN** a debug log is emitted with `conversationId`, `agentKind` (`text`, `action`, or `clarify`), and resulting assistant `type`

#### Scenario: Pipeline completed

- **WHEN** `createMessage` returns a completed or failed result
- **THEN** a debug log is emitted with `conversationId`, `type`, and `status`

### Requirement: LLM operation logging

Ollama calls used directly by the message pipeline background work (`summarizeText`) SHALL emit debug logs before and after the HTTP request with `llmOperation` and `durationMs`. Logs SHALL NOT include full prompt or model response text. Agent-runner LLM calls MAY be logged separately in a future change.

#### Scenario: LLM call completed

- **WHEN** an Ollama generate call for conversation summarization succeeds
- **THEN** a debug log is emitted with `llmOperation` and `durationMs`

#### Scenario: Action resolved after agent turn

- **WHEN** the agent turn completes with `kind: 'action'`
- **THEN** a debug log is emitted with `conversationId`, `actionName`, and `actionExecutor`

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

## REMOVED Requirements

### Requirement: Expected pipeline failure warn logging

**Reason**: The unsupported image-intent branch is removed. Expected failures without throw are no longer part of the agent pipeline.

**Migration**: Ambiguous or unsupported requests return completed clarify-as-text or failed throws from agent/persistence errors.
