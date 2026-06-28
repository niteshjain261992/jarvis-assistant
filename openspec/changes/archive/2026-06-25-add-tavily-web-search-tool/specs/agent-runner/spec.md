## MODIFIED Requirements

### Requirement: LangGraph agent runner service

The system SHALL provide `runAgent(input: { prompt: string; context: MessageDocument[]; summary?: string }, ws: WebSocket, context?: ClientTaskPersistenceContext): Promise<AgentRunResult>` in `src/agent/agent-runner.ts`. The runner SHALL use `ChatOllama` configured from `env.OLLAMA_BASE_URL` and `env.OLLAMA_MODEL`, bind tools from `buildToolsForConnection(ws, context)` imported only from `@/agent/tools/index.js`, and create a ReAct agent via `createAgent` from `langchain`. The system prompt SHALL include the Jarvis persona from `CONVERSATION_SYSTEM_PROMPT`, the current date and time formatted for `Asia/Kolkata` (IST) via `toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })`, and SHALL instruct the model that most requests are conversational (direct text, no tool call), tools should only be called when the request clearly matches a tool description, and when unsure the model SHALL prefer text over guessing a tool. `AgentRunResult` SHALL remain `{ kind: 'text'; content: string } | { kind: 'clarify'; content: string }` — it SHALL NOT include a `kind: 'action'` variant. Tool execution and action-row persistence happen inside each tool handler via `withToolPersistence` (client and server tools) and `requestFromClient` (client tools only); `runAgent` only resolves the agent's final `AIMessage` text. `resolveAgentRunResult` SHALL read the last message in the agent graph output: when it is an `AIMessage` with non-empty text content, return `{ kind: 'text', content }`; otherwise return `{ kind: 'clarify', content: CLARIFY_FALLBACK }`. The resolver SHALL NOT parse `ToolMessage` content or return `kind: 'action'`.

#### Scenario: Tool-invoking turn returns final AIMessage text after web search

- **WHEN** `runAgent` completes after `web_search` runs inside the agent graph and the last message in `result.messages` is an `AIMessage` synthesizing the search results
- **THEN** the result is `{ kind: 'text', content: <final AIMessage text> }`
- **AND** the result is NOT `{ kind: 'action', ... }`

#### Scenario: System prompt includes current IST date and time

- **WHEN** `buildAgentSystemPrompt()` is called
- **THEN** the returned string contains a line `Current date and time: <formatted> (IST, Asia/Kolkata)` where `<formatted>` is the current instant rendered in `Asia/Kolkata`

#### Scenario: Persistence context forwarded to tools

- **WHEN** `runAgent` is called with a `ClientTaskPersistenceContext` as the third argument
- **THEN** `buildToolsForConnection(ws, context)` receives that context so client and server tools can persist action rows via `withToolPersistence`
