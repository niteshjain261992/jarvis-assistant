## MODIFIED Requirements

### Requirement: Dual message insert

For each valid prompt submitted over WebSocket, the system SHALL insert two message rows in order:

1. User message: `role: 'user'`, `type: 'text'`, `content: prompt`, `status: 'completed'`, `parentId` unset
2. Assistant placeholder: `role: 'assistant'`, `type: 'text'`, `status: 'processing'`, `parentId` set to the user message `_id`

Both rows SHALL share the same `conversationId` and monotonic `sequenceNumber` values. The conversation `lastSequenceNumber` SHALL advance after the pipeline completes (to the assistant sequence for text-only turns, or to the action sequence when an action row is inserted).

#### Scenario: User and assistant rows persisted

- **WHEN** a valid prompt is submitted over WebSocket
- **THEN** MongoDB contains both user and assistant documents linked by `parentId`
- **AND** the assistant placeholder has `type: 'text'` and `status: 'processing'`

### Requirement: Agent-driven response

After dual message insert, the system SHALL invoke `runAgent` from `src/agent/agent-runner.ts` with the user prompt, the last 10 prior completed messages for the conversation (bounded by `userSequence`), the conversation's rolling `summary` when present, the session WebSocket, and a `ClientTaskPersistenceContext` derived from the pipeline context (`userMessageId`, `conversationId`, `actionSequenceNumber` = assistant sequence + 1). The pipeline SHALL map the agent result kind onto message rows and the WebSocket response as follows:

- `kind: 'text'` → assistant row (`type: 'text'`) receives `content` and `status: 'completed'`
- `kind: 'clarify'` → assistant row (`type: 'text'`) receives the clarify message as `content` and `status: 'completed'` — a normal completed turn, not a failure
- `kind: 'action'`, `actionExecutor: 'client'` → a separate action row (inserted by the broker during delegation) holds `type: 'action'`, `actionName`, `actionExecutor`, `actionPayload`, `actionResult`, and terminal `status`; the assistant placeholder remains `type: 'text'` and is finalized to `status: 'completed'` with `model` when the turn succeeds (or `failed` on error)
- `kind: 'action'`, `actionExecutor: 'server'` → the pipeline SHALL insert an action row at `actionSequenceNumber` with `parentId` = user message id, `type: 'action'`, `role: 'assistant'`, terminal action fields including `actionResult`, and `status: 'completed'`; the assistant placeholder is finalized to `status: 'completed'` with `model`

For all three kinds, the pipeline SHALL advance `lastSequenceNumber` and enqueue a background conversation-summary job before returning the WebSocket response. The WebSocket `MESSAGE_COMPLETED` payload for action turns SHALL include action fields sourced from the action row, not the assistant placeholder.

#### Scenario: Text response from agent

- **WHEN** `runAgent` returns `{ kind: 'text', content: '...' }`
- **THEN** the assistant row has `type: 'text'`, non-empty `content`, and `status: 'completed'`
- **AND** the WebSocket envelope has `data.type: 'text'` and matching `data.content`

#### Scenario: Clarify persists as completed text

- **WHEN** `runAgent` returns `{ kind: 'clarify', content: '...' }`
- **THEN** the assistant row has `type: 'text'` (not `clarify`), `status: 'completed'`, and `content` set to the clarify message
- **AND** the WebSocket envelope has `data.type: 'text'` and `data.status: 'completed'`

#### Scenario: Client-executed action from agent tool call

- **WHEN** `runAgent` returns `{ kind: 'action', actionExecutor: 'client', ... }` after a successful client round-trip
- **THEN** a separate action row exists with `type: 'action'`, `parentId` equal to the user message id, `status: 'completed'`, `actionName`, `actionExecutor: 'client'`, `actionPayload`, and `actionResult` from the client response
- **AND** the assistant placeholder row has `type: 'text'` and `status: 'completed'`
- **AND** the WebSocket response includes `actionName`, `actionExecutor: 'client'`, `actionPayload`, and `actionResult` from the action row
- **AND** no server-side action handler runs

#### Scenario: Client action pending during delegation

- **WHEN** a client-executor tool invokes `requestFromClient` during an agent turn
- **THEN** a new action row is inserted with `type: 'action'`, `parentId` equal to the user message id, and `status: 'pending'`
- **AND** the assistant placeholder row remains `type: 'text'` and is not updated to `type: 'action'`

#### Scenario: Server-executed action from agent tool call

- **WHEN** `runAgent` returns `{ kind: 'action', actionExecutor: 'server', ... }`
- **THEN** an action row is inserted with `parentId` equal to the user message id and includes `actionResult` after server handling
- **AND** the assistant placeholder row has `type: 'text'` and `status: 'completed'`

#### Scenario: Summary included in agent context

- **WHEN** the active conversation has a `summary` and `runAgent` is invoked
- **THEN** the agent system prompt includes the summary

#### Scenario: Context bounded to recent messages

- **WHEN** the conversation has more than 10 prior message rows
- **THEN** only the 10 most recent prior messages (before the current user turn) are passed as agent context

#### Scenario: Summary job scheduled for all agent outcomes

- **WHEN** the agent turn completes with `text`, `clarify`, or `action`
- **THEN** an `update-conversation-summary` Agenda job is enqueued before the WebSocket response is sent
