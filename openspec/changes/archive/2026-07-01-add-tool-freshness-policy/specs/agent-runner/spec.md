## ADDED Requirements

### Requirement: Generated tool freshness rules in system prompt

`buildAgentSystemPrompt` in `src/agent/agent-runner.ts` SHALL generate a "tool freshness rules" section by calling `getToolFreshnessRules()` from the tool registry and iterating its result — it SHALL NOT hardcode a list of tool names or reasons. For each entry with `refetchRequired: true`, the section SHALL include a line naming the tool, its `reason`, and an instruction to call that tool again on a repeat request instead of reusing a previous answer from the conversation history. Entries with `refetchRequired: false` SHALL be omitted from the section. If no registered tool has `refetchRequired: true`, the entire section SHALL be omitted from the system prompt. When present, the section SHALL be inserted immediately after `TOOL_USE_POLICY` and before the current date/time line.

#### Scenario: Freshness section lists refetch-required tools

- **WHEN** `buildAgentSystemPrompt(userContext)` is called and the registry has tools with `refetchRequired: true` (e.g. `web_search`, `open_camera`, `off_lights`, `play_music`)
- **THEN** the returned prompt contains a section naming each of those tools and instructing the model to call the tool again on repeat requests rather than reuse a prior answer

#### Scenario: Freshness section omitted when no tool requires refetch

- **WHEN** `buildAgentSystemPrompt(userContext)` is called and `getToolFreshnessRules()` returns no entry with `refetchRequired: true`
- **THEN** the returned prompt does not contain a freshness-rules section

#### Scenario: Freshness section is generated from the registry, not hardcoded

- **WHEN** a new tool with `refetchRequired: true` is registered in `TOOL_METADATA`
- **THEN** `buildAgentSystemPrompt` output includes a line for that tool without any change to `agent-runner.ts`

## MODIFIED Requirements

### Requirement: LangGraph agent runner service

The system SHALL provide `runAgent(input: { prompt: string; context: MessageDocument[]; summary?: string }, ws: WebSocket, context?: ClientTaskPersistenceContext): Promise<AgentRunResult>` in `src/agent/agent-runner.ts`. The runner SHALL use `ChatOllama` configured from `env.OLLAMA_BASE_URL` and `env.OLLAMA_MODEL`, bind tools from `buildToolsForConnection(ws, context)` imported only from `@/agent/tools/index.js`, and create a ReAct agent via `createAgent` from `langchain`. The system prompt SHALL include the Jarvis persona from `CONVERSATION_SYSTEM_PROMPT`, a reworded `TOOL_USE_POLICY`, the generated tool freshness rules section (see "Generated tool freshness rules in system prompt"), and the current date and time formatted for `Asia/Kolkata` (IST) via `toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })`. `TOOL_USE_POLICY` SHALL instruct the model that conversational requests needing no external data or device action are answered directly with text and no tool call; that when a request needs real-time information or a device action, the matching tool SHALL be called, including on repeat requests, rather than reusing an earlier answer from the conversation; and that when unsure whether a tool applies, the model SHALL prefer answering with text over guessing a tool. `TOOL_USE_POLICY` SHALL NOT contain an unconditional instruction to avoid calling tools. `AgentRunResult` SHALL be `{ kind: 'text'; content: string } | { kind: 'clarify'; content: string }` — it SHALL NOT include a `kind: 'action'` variant. Tool execution and action-row persistence happen inside each tool handler via `withToolPersistence` (client and server tools) and `requestFromClient` (client tools only); `runAgent` only resolves the agent's final `AIMessage` text. `resolveAgentRunResult` SHALL read the last message in the agent graph output: when it is an `AIMessage` with non-empty text content, return `{ kind: 'text', content }`; when the messages array is empty, the last message is not an `AIMessage`, or the last `AIMessage` has empty/whitespace content, return `{ kind: 'clarify', content: CLARIFY_FALLBACK }`. The resolver SHALL NOT parse `ToolMessage` content or return `kind: 'action'`.

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

#### Scenario: Repeated real-time query results in a fresh tool call

- **WHEN** the user asks a `web_search`-matching question (e.g. "what's the weather outside?"), the agent calls `web_search` and answers, and the same question is asked again in a later turn with the prior answer present in replayed history
- **THEN** the reworded `TOOL_USE_POLICY` and the generated freshness section instruct the model to call `web_search` again rather than reuse the earlier answer

### Requirement: Agent runner unit tests

The system SHALL include `tests/agent/agent-runner.test.ts` mocking LangChain/Ollama dependencies. Tests SHALL cover text results from a final `AIMessage` (including when preceded by tool-call messages), clarify fallback on empty/non-AIMessage/empty-content last messages and graph failure, and that every `runAgent` call passes a mock WebSocket as the second argument. Tests SHALL NOT assert `kind: 'action'` results or ToolMessage-as-last-message resolution. Tests SHALL additionally assert that `buildAgentSystemPrompt` output includes a freshness-rules section when refetch-required tools are registered, that the section names `web_search` and instructs the model to call it again on repeat rather than reuse a previous answer, that the reworded `TOOL_USE_POLICY` no longer contains an unconditional "do not call a tool" directive, and that `buildAgentSystemPrompt` still includes the existing persona, date/time, user-context-when-present, and summary-when-present sections.

#### Scenario: Mocked text path

- **WHEN** the mocked agent returns a final `AIMessage` without tool-call content in the last message
- **THEN** `runAgent(input, mockWs)` resolves to `{ kind: 'text', content }` matching that message content

#### Scenario: Mocked tool turn returns final AIMessage text

- **WHEN** the mocked agent returns messages ending in an `AIMessage` after tool-call and ToolMessage entries
- **THEN** `runAgent(input, mockWs)` resolves to `{ kind: 'text', content }` from the final AIMessage

#### Scenario: System prompt includes generated freshness section

- **WHEN** `buildAgentSystemPrompt(userContext)` is called in the test suite with the real tool registry
- **THEN** the output contains a freshness-rules section naming `web_search` and instructing the model not to reuse a previous answer from history

#### Scenario: TOOL_USE_POLICY regression guard

- **WHEN** `TOOL_USE_POLICY` is inspected in the test suite
- **THEN** it does not contain an unconditional instruction to avoid calling any tool

#### Scenario: Existing prompt sections still present

- **WHEN** `buildAgentSystemPrompt(userContext, summary)` is called with a non-empty `userContext` and `summary`
- **THEN** the output still includes the Jarvis persona, the current IST date/time line, the user context section, and the summary section
