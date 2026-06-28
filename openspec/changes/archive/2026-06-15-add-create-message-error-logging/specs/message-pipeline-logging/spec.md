## ADDED Requirements

### Requirement: Pipeline failure error logging

When `createMessage` or its internal helpers encounter an unexpected error that causes the pipeline to throw or abort, the system SHALL emit a structured `error`-level log entry before the error propagates. Each entry SHALL include `{ err }` (the underlying error when available), `conversationId`, and `pipelineStage` identifying where the failure occurred. When message IDs are assigned, logs SHALL also include `userMessageId` and `assistantMessageId`. When intent is known, logs SHALL include `intent`. Logs SHALL NOT include full user prompt text.

#### Scenario: Pipeline exception logged before rethrow

- **WHEN** an error is caught by the outer `createMessage` catch block after assistant message IDs are assigned
- **THEN** an error log is emitted with `{ err }`, `conversationId`, `userMessageId`, `assistantMessageId`, and `pipelineStage: 'pipeline'`
- **AND** the error is still re-thrown after the assistant row is marked failed

#### Scenario: Failed assistant update logged

- **WHEN** marking the assistant message as failed throws during the outer catch recovery
- **THEN** an error log is emitted with `{ err }`, `conversationId`, `userMessageId`, `assistantMessageId`, and `pipelineStage: 'markFailed'`
- **AND** the original pipeline error is still re-thrown

#### Scenario: Pre-pipeline persistence failure logged

- **WHEN** `getOrCreateActiveConversation` or message insert before intent classification throws
- **THEN** an error log is emitted with `{ err }`, `pipelineStage` (`conversationResolve`, `messageInsert`, or `conversationUpdate` as appropriate), and any IDs already assigned (`conversationId`, `userMessageId`, `assistantMessageId`)

### Requirement: Expected pipeline failure warn logging

When `createMessage` returns a failed result without throwing for an expected unsupported path, the system SHALL emit a structured `warn`-level log entry with `conversationId`, `intent`, `pipelineStage`, and `errorDetails`.

#### Scenario: Unsupported image intent logged

- **WHEN** `classifyIntent` returns `image` and the pipeline returns a failed result with `errorDetails: 'Image intent not supported'`
- **THEN** a warn log is emitted with `conversationId`, `intent: 'image'`, `pipelineStage: 'imageBranch'`, and `errorDetails`
