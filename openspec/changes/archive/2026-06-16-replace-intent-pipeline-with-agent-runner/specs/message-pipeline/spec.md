## REMOVED Requirements

### Requirement: Intent classification

**Reason**: Superseded by a single LangGraph agent turn that decides text vs tool call internally.

**Migration**: No client changes. Prompts previously classified as `conversation`, `action`, or `image` are handled by `runAgent`; outcomes map to `text`, `action`, or completed clarify-as-text.

### Requirement: Conversation branch

**Reason**: Conversation replies are produced by the agent runner's text outcome, not a separate `generateConversationResponse` call.

**Migration**: Completed text responses still persist as `type: 'text'` with the same WebSocket envelope.

### Requirement: Action branch

**Reason**: Actions are selected via LangChain tool calls in the agent runner, not a separate `interpretCommand` step after intent classification.

**Migration**: Completed action responses still persist as `type: 'action'` with `actionName`, `actionExecutor`, `actionPayload`, and optional `actionResult` for server executor.

## ADDED Requirements

### Requirement: Agent-driven response

After dual message insert, the system SHALL invoke `runAgent` from `src/agent/agent-runner.ts` with the user prompt, the last 10 prior completed messages for the conversation (bounded by `userSequence`), and the conversation's rolling `summary` when present. The pipeline SHALL map the agent result kind onto the assistant message row and WebSocket response as follows:

- `kind: 'text'` → assistant `type: 'text'`, `content` set to the text, `status: 'completed'`
- `kind: 'clarify'` → assistant `type: 'text'` (not a separate document type), `content` set to the clarify message, `status: 'completed'` — a normal completed turn, not a failure
- `kind: 'action'` → assistant `type: 'action'` with `actionName`, `actionExecutor`, `actionPayload`, `status: 'completed'`; when `actionExecutor` is `server`, the backend SHALL run the existing server action handler and persist `actionResult`

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

- **WHEN** `runAgent` returns `{ kind: 'action', actionExecutor: 'client', ... }`
- **THEN** the response includes `actionName`, `actionExecutor: 'client'`, and `actionPayload`
- **AND** no server-side action handler runs

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

## MODIFIED Requirements

### Requirement: Synchronous single response

The message pipeline SHALL return the final assistant outcome in one WebSocket response frame per prompt. No poll endpoint is required. For completed exchanges, the pipeline SHALL enqueue a background conversation-summary job before sending the response. The pipeline SHALL emit structured debug logs at key checkpoints (see `message-pipeline-logging` capability).

#### Scenario: Completed assistant in WebSocket response

- **WHEN** the pipeline succeeds
- **THEN** the server sends a JSON frame with `code: "MESSAGE_COMPLETED"` and `data` containing `conversationId`, assistant `type`, `status`, and the appropriate content or action fields

#### Scenario: Summary job scheduled before response

- **WHEN** the pipeline succeeds with `status: 'completed'`
- **THEN** an `update-conversation-summary` Agenda job is enqueued before the WebSocket response frame is sent

#### Scenario: Pipeline debug trace

- **WHEN** `LOG_LEVEL` is `debug` and a valid WebSocket prompt is processed
- **THEN** debug logs are emitted for conversation resolution, message insert, agent turn entry/completion, and pipeline completion

#### Scenario: Pipeline failure

- **WHEN** the agent turn or persistence throws
- **THEN** the assistant row is marked `failed` with `errorDetails` and the WebSocket response uses `MESSAGE_FAILED` or an appropriate `LLM_*` error code

### Requirement: Modular message service structure

The message pipeline service (`src/services/message.service.ts`) SHALL implement the agent response path in a dedicated private function `runAgentTurn(ctx: PipelineContext)` invoked from a thin `createMessage` orchestrator. Pipeline setup (conversation resolution and dual message insert) SHALL live in a dedicated private function. Thrown pipeline failures SHALL be recovered through a single centralized error-recovery helper. `PipelineContext` SHALL NOT include intent classification state.

#### Scenario: Agent turn isolated

- **WHEN** a valid prompt is processed after dual insert
- **THEN** agent-specific logic runs in `runAgentTurn`, not inline in `createMessage`

#### Scenario: Centralized thrown-error recovery

- **WHEN** `runAgentTurn` throws after messages are persisted
- **THEN** error logging, assistant row failure marking, and re-throw are handled by one shared recovery helper

#### Scenario: Behavior unchanged after transport removal

- **WHEN** any existing message-pipeline scenario is exercised via WebSocket after REST removal
- **THEN** WebSocket envelope responses, persistence side effects, and logging semantics match pre-removal behavior for the same prompts where applicable
