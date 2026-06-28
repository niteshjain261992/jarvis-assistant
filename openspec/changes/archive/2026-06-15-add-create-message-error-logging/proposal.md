# Proposal: add-create-message-error-logging

## Why

The `createMessage` pipeline already emits structured **debug** logs on the happy path, but failures are mostly silent at the log layer: the top-level `catch` updates the assistant message and re-throws without an `error` log, and repository failures in `getOrCreateActiveConversation` or pre-pipeline message inserts propagate with no structured context. Operators debugging production failures cannot correlate what stage failed or for which conversation without reading HTTP error responses alone.

## What Changes

- Add structured **`error`-level** logs when `createMessage` or its internal helpers fail unexpectedly (repository errors, LLM/pipeline exceptions caught by the outer `catch`)
- Log **`warn`-level** for expected pipeline failures that return a failed result without throwing (e.g. unsupported `image` intent)
- Include correlation fields on every error/warn log: `conversationId`, `userMessageId`, `assistantMessageId` when available, plus `pipelineStage` and `intent`/`branch` when known
- Log the underlying `err` object via pino's `{ err }` convention; do **not** log full user prompts
- Extend unit tests to assert error/warn logger calls on failure paths
- Keep existing debug logs and HTTP/API behavior unchanged (still re-throw after persisting failed assistant message)

## Capabilities

### New Capabilities

_None — this extends existing logging requirements._

### Modified Capabilities

- `message-pipeline-logging`: Add requirements for error and warn logging on pipeline failure paths in `createMessage` and its internal functions
- `logging`: Document error-level pipeline failure logging conventions alongside existing debug observability

## Impact

- **Code**: `src/services/message.service.ts`, `tests/services/message.service.test.ts`
- **HTTP**: No API contract change; errors still propagate to the global error handler
- **Tests**: Add failure-path logger assertions; coverage must remain ≥ 90%
- **Ops**: Failures visible at default `LOG_LEVEL=info` without enabling debug
