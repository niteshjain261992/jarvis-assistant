# agent-runner Specification

## Purpose

Define the LangGraph-based agent runner (`runAgent`) that unifies conversational replies and tool execution behind a single entry point, returning structured `text` or `clarify` results for downstream message pipeline integration. Tool execution and action-row persistence happen inside tool handlers via `withToolPersistence` and `requestFromClient`.

## Requirements

### Requirement: LangGraph agent runner service

The system SHALL provide `runAgent(input: { prompt: string; context: MessageDocument[]; summary?: string }, ws: WebSocket, context?: ClientTaskPersistenceContext): Promise<AgentRunResult>` in `src/agent/agent-runner.ts`. The runner SHALL use `ChatOllama` configured from `env.OLLAMA_BASE_URL` and `env.OLLAMA_MODEL`, bind tools from `buildToolsForConnection(ws, context)` imported only from `@/agent/tools/index.js`, and create a ReAct agent via `createAgent` from `langchain`. The system prompt SHALL include the Jarvis persona from `CONVERSATION_SYSTEM_PROMPT`, the current date and time formatted for `Asia/Kolkata` (IST) via `toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })`, and SHALL instruct the model that most requests are conversational (direct text, no tool call), tools should only be called when the request clearly matches a tool description, and when unsure the model SHALL prefer text over guessing a tool. `AgentRunResult` SHALL be `{ kind: 'text'; content: string } | { kind: 'clarify'; content: string }` — it SHALL NOT include a `kind: 'action'` variant. Tool execution and action-row persistence happen inside each tool handler via `withToolPersistence` (client and server tools) and `requestFromClient` (client tools only); `runAgent` only resolves the agent's final `AIMessage` text. `resolveAgentRunResult` SHALL read the last message in the agent graph output: when it is an `AIMessage` with non-empty text content, return `{ kind: 'text', content }`; when the messages array is empty, the last message is not an `AIMessage`, or the last `AIMessage` has empty/whitespace content, return `{ kind: 'clarify', content: CLARIFY_FALLBACK }`. The resolver SHALL NOT parse `ToolMessage` content or return `kind: 'action'`.

#### Scenario: Conversational prompt returns text result

- **WHEN** `runAgent` is invoked and the agent's final message is an `AIMessage` with non-empty content
- **THEN** the result is `{ kind: 'text', content: <final message text> }`

#### Scenario: Tool-invoking turn returns final AIMessage text

- **WHEN** `runAgent` completes after a tool call and the last message in `result.messages` is an `AIMessage` (preceded by earlier tool-call and ToolMessage entries)
- **THEN** the result is `{ kind: 'text', content: <final AIMessage text> }`
- **AND** the result is NOT `{ kind: 'action', ... }`

#### Scenario: Tool-invoking turn returns final AIMessage text after web search

- **WHEN** `runAgent` completes after `web_search` runs inside the agent graph and the last message in `result.messages` is an `AIMessage` synthesizing the search results
- **THEN** the result is `{ kind: 'text', content: <final AIMessage text> }`
- **AND** the result is NOT `{ kind: 'action', ... }`

#### Scenario: System prompt includes current IST date and time

- **WHEN** `buildAgentSystemPrompt()` is called
- **THEN** the returned string contains a line `Current date and time: <formatted> (IST, Asia/Kolkata)` where `<formatted>` is the current instant rendered in `Asia/Kolkata`

#### Scenario: Empty or non-AIMessage last message returns clarify

- **WHEN** `resolveAgentRunResult` receives an empty messages array, a last message that is not an `AIMessage`, or an `AIMessage` with empty/whitespace content
- **THEN** the result is `{ kind: 'clarify', content: CLARIFY_FALLBACK }`

#### Scenario: Recursion limit or graph failure returns clarify

- **WHEN** the agent invoke throws (including client task timeout propagated from a tool handler) or returns without a usable final state within `recursionLimit`
- **THEN** the result is `{ kind: 'clarify', content: <fallback message> }`

#### Scenario: Context uses completed messages only

- **WHEN** `runAgent` receives `context` containing pending or empty messages
- **THEN** only messages with `status === 'completed'` and non-empty `content` are included, using the same filtering logic as `filterCompletedContextMessages`

#### Scenario: Persistence context forwarded to tools

- **WHEN** `runAgent` is called with a `ClientTaskPersistenceContext` as the third argument
- **THEN** `buildToolsForConnection(ws, context)` receives that context so client and server tools can persist action rows via `withToolPersistence`

### Requirement: Agent runner unit tests

The system SHALL include `tests/agent/agent-runner.test.ts` mocking LangChain/Ollama dependencies. Tests SHALL cover text results from a final `AIMessage` (including when preceded by tool-call messages), clarify fallback on empty/non-AIMessage/empty-content last messages and graph failure, and that every `runAgent` call passes a mock WebSocket as the second argument. Tests SHALL NOT assert `kind: 'action'` results or ToolMessage-as-last-message resolution.

#### Scenario: Mocked text path

- **WHEN** the mocked agent returns a final `AIMessage` without tool-call content in the last message
- **THEN** `runAgent(input, mockWs)` resolves to `{ kind: 'text', content }` matching that message content

#### Scenario: Mocked tool turn returns final AIMessage text

- **WHEN** the mocked agent returns messages ending in an `AIMessage` after tool-call and ToolMessage entries
- **THEN** `runAgent(input, mockWs)` resolves to `{ kind: 'text', content }` from the final AIMessage
