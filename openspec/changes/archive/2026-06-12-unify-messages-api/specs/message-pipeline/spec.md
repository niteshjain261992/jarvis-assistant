# message-pipeline Specification

## Purpose

Define the synchronous `POST /messages` conversation pipeline: active session management, dual message persistence, intent classification, and a single response with the completed assistant message.

## ADDED Requirements

### Requirement: Active conversation resolution

Before processing a prompt, the system SHALL find an existing `active` conversation for the request source (default `mobile`) or create a new conversation with `status: 'active'` and `lastSequenceNumber: 0`.

#### Scenario: Reuse active conversation

- **WHEN** an `active` conversation exists for source `mobile`
- **THEN** the pipeline uses that `conversationId`

#### Scenario: Create conversation when none active

- **WHEN** no `active` conversation exists for the source
- **THEN** a new conversation document is created and used for subsequent message inserts

### Requirement: Dual message insert

For each `POST /messages` request, the system SHALL insert two message rows in order:

1. User message: `role: 'user'`, `type: 'text'`, `content: prompt`, `status: 'completed'`
2. Assistant placeholder: `role: 'assistant'`, `status: 'processing'`, `parentId` set to the user message `_id`

Both rows SHALL share the same `conversationId` and monotonic `sequenceNumber` values. The conversation `lastSequenceNumber` SHALL advance after the pipeline completes.

#### Scenario: User and assistant rows persisted

- **WHEN** a valid prompt is submitted
- **THEN** MongoDB contains both user and assistant documents linked by `parentId`

### Requirement: Intent classification

The system SHALL call a silent intent step (Ollama) that classifies the prompt into `conversation`, `action`, or `image` before the main model runs.

#### Scenario: Conversation intent

- **WHEN** the prompt is informational (e.g. "What is the capital of France?")
- **THEN** intent resolves to `conversation`

#### Scenario: Action intent

- **WHEN** the prompt is a device command (e.g. "Open Camera")
- **THEN** intent resolves to `action`

### Requirement: Conversation branch

When intent is `conversation`, the system SHALL call the main model with conversation context, update the assistant row to `type: 'text'`, set `content` to the model response, `status: 'completed'`, and include `model` when available.

#### Scenario: Text response returned

- **WHEN** intent is `conversation` and the main model succeeds
- **THEN** `POST /messages` responds with `type: 'text'` and non-empty `content`

### Requirement: Action branch

When intent is `action`, the system SHALL interpret the command, update the assistant row to `type: 'action'` with `actionName`, `actionExecutor`, `actionPayload`, and `status: 'completed'`. When `actionExecutor` is `server`, the backend SHALL run a server action handler and persist `actionResult`. When `actionExecutor` is `client`, the response SHALL include action fields for the client to execute.

#### Scenario: Client-executed action

- **WHEN** intent is `action` and the command maps to `client`
- **THEN** the response includes `actionName`, `actionExecutor: 'client'`, and `actionPayload`

#### Scenario: Server-executed action

- **WHEN** intent is `action` and the command maps to `server`
- **THEN** the assistant row includes `actionResult` after server handling

### Requirement: Synchronous single response

`POST /messages` SHALL return the final assistant outcome in one HTTP response. No poll endpoint is required.

#### Scenario: Completed assistant in POST response

- **WHEN** the pipeline succeeds
- **THEN** the response is HTTP 200 with envelope code `MESSAGE_COMPLETED` and `data` containing `conversationId`, assistant `type`, `status`, and the appropriate content or action fields

#### Scenario: Pipeline failure

- **WHEN** intent or main model fails
- **THEN** the assistant row is marked `failed` with `errorDetails` and the response uses `MESSAGE_FAILED` or an appropriate `LLM_*` error
