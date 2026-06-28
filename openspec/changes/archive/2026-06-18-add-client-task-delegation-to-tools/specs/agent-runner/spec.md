## MODIFIED Requirements

### Requirement: LangGraph agent runner service

The system SHALL provide `runAgent(input: { prompt: string; context: MessageDocument[]; summary?: string }, ws: WebSocket): Promise<AgentRunResult>` in `src/agent/agent-runner.ts`. The runner SHALL use `ChatOllama` configured from `env.OLLAMA_BASE_URL` and `env.OLLAMA_MODEL`, bind tools from `buildToolsForConnection(ws)` imported only from `@/agent/tools/index.js`, and create a ReAct agent via `createAgent` from `langchain`. The system prompt SHALL include the Jarvis persona from `CONVERSATION_SYSTEM_PROMPT` and SHALL instruct the model that most requests are conversational (direct text, no tool call), tools should only be called when the request clearly matches a tool description, and when unsure the model SHALL prefer text over guessing a tool. For action results, `actionPayload` SHALL be derived from the ToolMessage content produced by the awaited tool execution (including real client results), not from static metadata alone and not from a second tool invoke in `resolveAgentRunResult`.

#### Scenario: Conversational prompt returns text result

- **WHEN** `runAgent` is invoked and the agent's final message has no `tool_calls`
- **THEN** the result is `{ kind: 'text', content: <final message text> }`

#### Scenario: Action prompt returns action result with client outcome

- **WHEN** `runAgent` is invoked with a WebSocket, a client-executor tool runs inside the agent graph, and the client responds successfully
- **THEN** the result is `{ kind: 'action', actionName, actionExecutor, actionPayload }` where `actionPayload` includes the client `result` from the ToolMessage

#### Scenario: Tool-call message determines action resolution

- **WHEN** the agent completes with an AIMessage containing `tool_calls` and a subsequent ToolMessage in `messages`
- **THEN** the runner resolves action fields from that tool-call exchange (not by re-invoking the tool handler)

#### Scenario: Recursion limit or graph failure returns clarify

- **WHEN** the agent invoke throws (including client task timeout propagated from a tool handler) or returns without a usable final state within `recursionLimit`
- **THEN** the result is `{ kind: 'clarify', content: <fallback message> }`

#### Scenario: Context uses completed messages only

- **WHEN** `runAgent` receives `context` containing pending or empty messages
- **THEN** only messages with `status === 'completed'` and non-empty `content` are included, using the same filtering logic as `buildConversationPrompt`

### Requirement: Agent runner unit tests

The system SHALL include `tests/agent/agent-runner.test.ts` mocking LangChain/Ollama dependencies. Tests SHALL cover text results, action results with registry resolution and client `result` in `actionPayload`, clarify fallback on recursion failure and client task failure, and that every `runAgent` call passes a mock WebSocket as the second argument.

#### Scenario: Mocked text path

- **WHEN** the mocked agent returns a final message without `tool_calls`
- **THEN** `runAgent(input, mockWs)` resolves to `{ kind: 'text', content }` matching that message content

#### Scenario: Mocked action path with client result

- **WHEN** the mocked agent returns messages including a tool call and ToolMessage whose content reflects a resolved client result
- **THEN** `runAgent(input, mockWs)` resolves with `actionPayload` containing that client result
