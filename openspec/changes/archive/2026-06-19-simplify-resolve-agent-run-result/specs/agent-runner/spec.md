## MODIFIED Requirements

### Requirement: LangGraph agent runner service

The system SHALL provide `runAgent(input: { prompt: string; context: MessageDocument[]; summary?: string }, ws: WebSocket, context?: ClientTaskPersistenceContext): Promise<AgentRunResult>` in `src/agent/agent-runner.ts`. The runner SHALL use `ChatOllama` configured from `env.OLLAMA_BASE_URL` and `env.OLLAMA_MODEL`, bind tools from `buildToolsForConnection(ws, context)` imported only from `@/agent/tools/index.js`, and create a ReAct agent via `createAgent` from `langchain`. The system prompt SHALL include the Jarvis persona from `CONVERSATION_SYSTEM_PROMPT` and SHALL instruct the model that most requests are conversational (direct text, no tool call), tools should only be called when the request clearly matches a tool description, and when unsure the model SHALL prefer text over guessing a tool. For action results, `resolveAgentRunResult` SHALL read the last message in the agent graph output: when it is a `ToolMessage`, parse its content as `ToolHandlerResult` and map `commandName`, `executor`, and `payload` to `actionName`, `actionExecutor`, and `actionPayload` respectively (including real client results in `actionPayload`); when it is an `AIMessage`, return text from that message. The resolver SHALL NOT scan for AIMessage `tool_calls`, match by `tool_call_id`, or invoke the tool registry.

#### Scenario: Conversational prompt returns text result

- **WHEN** `runAgent` is invoked and the agent's final message is an `AIMessage` with no preceding unresolved tool step as the last message
- **THEN** the result is `{ kind: 'text', content: <final message text> }`

#### Scenario: Action prompt returns action result with client outcome

- **WHEN** `runAgent` is invoked with a WebSocket, a client-executor tool runs inside the agent graph, and the last message in `result.messages` is a `ToolMessage` whose content is a valid `ToolHandlerResult` including the client `result` in `payload`
- **THEN** the result is `{ kind: 'action', actionName, actionExecutor, actionPayload }` where fields are taken directly from the parsed `ToolHandlerResult`

#### Scenario: Last ToolMessage determines action resolution

- **WHEN** the agent completes with messages ending in a `ToolMessage` containing serialized `ToolHandlerResult` JSON
- **THEN** `resolveAgentRunResult` resolves action fields from that last message only (not by locating an AIMessage with `tool_calls` or re-invoking a tool handler)

#### Scenario: Recursion limit or graph failure returns clarify

- **WHEN** the agent invoke throws (including client task timeout propagated from a tool handler) or returns without a usable final state within `recursionLimit`
- **THEN** the result is `{ kind: 'clarify', content: <fallback message> }`

#### Scenario: Context uses completed messages only

- **WHEN** `runAgent` receives `context` containing pending or empty messages
- **THEN** only messages with `status === 'completed'` and non-empty `content` are included, using the same filtering logic as `filterCompletedContextMessages`

#### Scenario: Persistence context forwarded to tools

- **WHEN** `runAgent` is called with a `ClientTaskPersistenceContext` as the third argument
- **THEN** `buildToolsForConnection(ws, context)` receives that context so client tools can correlate broker `requestId` with the assistant message row

### Requirement: Agent runner unit tests

The system SHALL include `tests/agent/agent-runner.test.ts` mocking LangChain/Ollama dependencies. Tests SHALL cover text results from a final `AIMessage`, action results parsed from a final `ToolMessage` `ToolHandlerResult` (including client `result` in `actionPayload`), clarify fallback on empty/invalid last messages and graph failure, and that every `runAgent` call passes a mock WebSocket as the second argument.

#### Scenario: Mocked text path

- **WHEN** the mocked agent returns a final `AIMessage` without a trailing `ToolMessage`
- **THEN** `runAgent(input, mockWs)` resolves to `{ kind: 'text', content }` matching that message content

#### Scenario: Mocked action path with client result

- **WHEN** the mocked agent returns messages whose last entry is a `ToolMessage` whose content reflects a resolved client result as `ToolHandlerResult`
- **THEN** `runAgent(input, mockWs)` resolves with `actionPayload` containing that client result
