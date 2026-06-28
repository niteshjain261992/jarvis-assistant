# tool-persistence Specification

## Purpose

Define a shared action-row lifecycle wrapper (`withToolPersistence`) for client and server tool execution, decoupling database persistence from WebSocket delegation.

## Requirements

### Requirement: withToolPersistence action-row lifecycle

The system SHALL provide `withToolPersistence` in `src/agent/tools/tool-persistence.ts` that wraps tool execution with a database action-row lifecycle. The function SHALL accept `ClientTaskPersistenceContext`, `actionName`, `actionPayload`, `executor` (`'client' | 'server'`), and an `execute: () => Promise<T>` callback. It SHALL generate a new `messageId` via `crypto.randomUUID()`, insert a pending action row, invoke `execute()`, update the row to completed or failed, and return or re-throw accordingly. `ClientTaskPersistenceContext` SHALL be defined in this module with fields `conversationId`, `userMessageId`, and `actionSequenceNumber`, and re-exported for consumers via `src/agent/tools/types.ts` and `src/agent/tools/index.ts`.

#### Scenario: Inserts pending row before execute

- **WHEN** `withToolPersistence(context, actionName, actionPayload, executor, execute)` is called
- **THEN** `insertMessage` is called with `_id` equal to the generated `messageId`, `status: 'pending'`, `type: 'action'`, `role: 'assistant'`, `parentId` equal to `context.userMessageId`, `conversationId`, `sequenceNumber` equal to `context.actionSequenceNumber`, `actionName`, `actionExecutor` equal to `executor`, and `actionPayload`
- **AND** `execute()` is invoked only after the insert attempt

#### Scenario: Updates to completed on success

- **WHEN** `execute()` resolves with a result
- **THEN** `updateMessage` is called on the generated `messageId` with `status: 'completed'` and `actionResult` set from the result
- **AND** plain objects are stored as-is, while primitives and arrays are wrapped as `{ value: result }`
- **AND** the resolved value is returned to the caller

#### Scenario: Updates to failed and re-throws on error

- **WHEN** `execute()` rejects or throws
- **THEN** `updateMessage` is called with `status: 'failed'` and `errorDetails` from the error message (`JarvisError.message` when applicable)
- **AND** the original error is re-thrown to the caller

#### Scenario: Persistence errors are non-fatal

- **WHEN** `insertMessage` or `updateMessage` throws during the lifecycle
- **THEN** the error is logged and not propagated
- **AND** `execute()` still runs on insert failure
- **AND** the success result or thrown error still reaches the caller on update failure

### Requirement: Tool persistence unit tests

The change SHALL include Jest unit tests for `tool-persistence.ts` under `tests/agent/tools/tool-persistence.test.ts` covering pending insert before execute, completed and failed updates, error re-throw, non-fatal persistence failures, and result normalization for objects, primitives, and arrays.

#### Scenario: Tests under tests/agent/tools

- **WHEN** the tool persistence test suite is listed
- **THEN** test files reside under `tests/agent/tools/` and are discovered by `npm test`
