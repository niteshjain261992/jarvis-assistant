## MODIFIED Requirements

### Requirement: Agent-driven response

After dual message insert, the system SHALL invoke `runAgent` from `src/agent/agent-runner.ts` with the user prompt, the last 10 prior completed messages for the conversation (bounded by `userSequence`), the conversation's rolling `summary` when present, the session WebSocket, and a `ClientTaskPersistenceContext` derived from the pipeline context (`messageId` = assistant placeholder `_id`, `conversationId`). The pipeline SHALL map the agent result kind onto the assistant message row and WebSocket response as follows:

- `kind: 'text'` → assistant `type: 'text'`, `content` set to the text, `status: 'completed'`
- `kind: 'clarify'` → assistant `type: 'text'` (not a separate document type), `content` set to the clarify message, `status: 'completed'` — a normal completed turn, not a failure
- `kind: 'action'` → assistant `type: 'action'` with `actionName`, `actionExecutor`, `actionPayload`, `status: 'completed'`; when `actionExecutor` is `server`, the backend SHALL run the existing server action handler and persist `actionResult`; when `actionExecutor` is `client`, the broker SHALL have already transitioned the assistant row through `pending` during delegation and `completed` with `actionResult` on `resolveClientTask`, and the pipeline finalization SHALL NOT overwrite an already-completed row or its `actionResult`

For all three kinds, the pipeline SHALL advance `lastSequenceNumber` and enqueue a background conversation-summary job before returning the WebSocket response.

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
- **THEN** the assistant row has `type: 'action'`, `status: 'completed'`, `actionName`, `actionExecutor: 'client'`, `actionPayload`, and `actionResult` persisted from the client response
- **AND** the WebSocket response includes `actionName`, `actionExecutor: 'client'`, `actionPayload`, and `actionResult`
- **AND** no server-side action handler runs

#### Scenario: Client action pending during delegation

- **WHEN** a client-executor tool invokes `requestFromClient` during an agent turn
- **THEN** the assistant placeholder row has `type: 'action'` and `status: 'pending'` before the client responds

#### Scenario: Server-executed action from agent tool call

- **WHEN** `runAgent` returns `{ kind: 'action', actionExecutor: 'server', ... }`
- **THEN** the assistant row includes `actionResult` after server handling

#### Scenario: Summary included in agent context

- **WHEN** the active conversation has a `summary` and `runAgent` is invoked
- **THEN** the agent system prompt includes the summary

#### Scenario: Context bounded to recent messages

- **WHEN** the conversation has more than 10 prior message rows
- **THEN** only the 10 most recent prior messages (before the current user turn) are passed as agent context

#### Scenario: Summary job scheduled for all agent outcomes

- **WHEN** the agent turn completes with `text`, `clarify`, or `action`
- **THEN** an `update-conversation-summary` Agenda job is enqueued before the WebSocket response is sent
