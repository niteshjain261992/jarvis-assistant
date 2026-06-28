## MODIFIED Requirements

### Requirement: Agent-driven response

After dual message insert, the system SHALL resolve the single user once per turn via `userRepository.findSingleUser` and SHALL invoke `runAgent` from `src/agent/agent-runner.ts` with the user prompt, the last 10 prior completed messages for the conversation (bounded by `userSequence`), the conversation's rolling `summary` when present, the resolved user's id as `userId` (`user?._id ?? ''`), the session WebSocket, and a `ClientTaskPersistenceContext` derived from the pipeline context (`userMessageId`, `conversationId`, `actionSequenceNumber` = assistant sequence + 1). Before the LLM call, `runAgent` SHALL retrieve user context for the prompt and the resolved `userId` and inject it into the agent system prompt; retrieval failure SHALL degrade to no injected context rather than failing the turn, and an empty or falsy `userId` SHALL produce no context. `runAgent` SHALL return only `{ kind: 'text' }` or `{ kind: 'clarify' }`. Tool execution and client action persistence happen inside tool handlers via `requestFromClient` and the client-task broker — not via a post-agent `kind: 'action'` branch. The pipeline SHALL map the agent result onto message rows and the WebSocket response as follows:

- `kind: 'text'` → assistant row (`type: 'text'`) receives `content` and `status: 'completed'`
- `kind: 'clarify'` → assistant row (`type: 'text'`) receives the clarify message as `content` and `status: 'completed'` — a normal completed turn, not a failure

For both kinds, the pipeline SHALL advance `lastSequenceNumber` to the assistant sequence and enqueue a background conversation-summary job before returning the WebSocket response with `data.type: 'text'`.

Client-executor action rows (`type: 'action'`) are inserted by `client-task-broker.ts` during tool delegation — not by `runAgentTurn`. The pipeline SHALL NOT call `findLatestActionMessageByParentId` or `runServerAction`.

#### Scenario: User resolved and context injected before the LLM call

- **WHEN** a valid prompt is processed after dual insert and a user exists
- **THEN** `runAgentTurn` resolves the user via `findSingleUser` and passes `user._id` as `runAgent`'s `userId`
- **AND** user context is retrieved for the prompt and injected into the agent system prompt before the LLM is invoked

#### Scenario: Missing user does not fail the turn

- **WHEN** `findSingleUser` returns `null`
- **THEN** `runAgent` is invoked with `userId` set to `''`, no user context is injected, and the turn still completes

#### Scenario: Retrieval failure degrades to no context

- **WHEN** user-context retrieval fails during an agent turn
- **THEN** no user-context section is injected and the turn still produces a normal `{ kind: 'text' }` or `{ kind: 'clarify' }` outcome

#### Scenario: Text response from agent

- **WHEN** `runAgent` returns `{ kind: 'text', content: '...' }`
- **THEN** the assistant row has `type: 'text'`, non-empty `content`, and `status: 'completed'`
- **AND** the WebSocket envelope has `data.type: 'text'` and matching `data.content`

#### Scenario: Clarify persists as completed text

- **WHEN** `runAgent` returns `{ kind: 'clarify', content: '...' }`
- **THEN** the assistant row has `type: 'text'` (not `clarify`), `status: 'completed'`, and `content` set to the clarify message
- **AND** the WebSocket envelope has `data.type: 'text'` and `data.status: 'completed'`

#### Scenario: Tool-invoking turn persists assistant text after broker action

- **WHEN** a client-executor tool runs during an agent turn, the broker inserts and completes an action row, and `runAgent` returns `{ kind: 'text', content: '...' }`
- **THEN** the action row exists in MongoDB with `type: 'action'` from broker persistence
- **AND** the assistant placeholder row is updated to `type: 'text'`, `status: 'completed'`, with the agent's final `content`
- **AND** `createMessage` returns `CreateMessageResult.type: 'text'` (not `'action'`)
- **AND** `runAgentTurn` does NOT call `findLatestActionMessageByParentId`

#### Scenario: Client action pending during delegation

- **WHEN** a client-executor tool invokes `requestFromClient` during an agent turn
- **THEN** a new action row is inserted with `type: 'action'`, `parentId` equal to the user message id, and `status: 'pending'`
- **AND** the assistant placeholder row remains `type: 'text'` and is not updated to `type: 'action'`

#### Scenario: Summary included in agent context

- **WHEN** the active conversation has a `summary` and `runAgent` is invoked
- **THEN** the agent system prompt includes the summary

#### Scenario: Context bounded to recent messages

- **WHEN** the conversation has more than 10 prior message rows
- **THEN** only the 10 most recent prior messages (before the current user turn) are passed as agent context

#### Scenario: Summary job scheduled for all agent outcomes

- **WHEN** the agent turn completes with `text` or `clarify`
- **THEN** an `update-conversation-summary` Agenda job is enqueued before the WebSocket response is sent
