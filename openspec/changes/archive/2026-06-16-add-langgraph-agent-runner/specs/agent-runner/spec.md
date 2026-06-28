## ADDED Requirements

### Requirement: LangGraph agent runner service

The system SHALL provide `runAgent(input: { prompt: string; context: MessageDocument[]; summary?: string }): Promise<AgentRunResult>` in `src/agent/agent-runner.ts`. The runner SHALL use `ChatOllama` configured from `env.OLLAMA_BASE_URL` and `env.OLLAMA_MODEL`, bind tools from `getStructuredTools()` imported only from `@/agent/tools/index.js`, and create a ReAct agent via `createReactAgent`. The system prompt SHALL include the Jarvis persona from `CONVERSATION_SYSTEM_PROMPT` and SHALL instruct the model that most requests are conversational (direct text, no tool call), tools should only be called when the request clearly matches a tool description, and when unsure the model SHALL prefer text over guessing a tool.

#### Scenario: Conversational prompt returns text result

- **WHEN** `runAgent` is invoked and the agent's final message has no `tool_calls`
- **THEN** the result is `{ kind: 'text', content: <final message text> }`

#### Scenario: Action prompt returns action result

- **WHEN** `runAgent` is invoked and the last message in agent state has non-empty `tool_calls` for a registered tool
- **THEN** the result is `{ kind: 'action', actionName, actionExecutor, actionPayload }` resolved from the tools registry

#### Scenario: Last message determines result kind

- **WHEN** the agent completes with a plain text AIMessage as the last entry in `messages`
- **THEN** the runner inspects that last message (not earlier tool-call messages only) and returns `kind: 'text'`

#### Scenario: Recursion limit or graph failure returns clarify

- **WHEN** the agent invoke throws or returns without a usable final message within `recursionLimit`
- **THEN** the result is `{ kind: 'clarify', content: <fallback message> }`

#### Scenario: Context uses completed messages only

- **WHEN** `runAgent` receives `context` containing pending or empty messages
- **THEN** only messages with `status === 'completed'` and non-empty `content` are included, using the same filtering logic as `buildConversationPrompt`

### Requirement: Agent runner unit tests

The system SHALL include `tests/agent/agent-runner.test.ts` mocking LangChain/Ollama dependencies. Tests SHALL cover text results, action results with registry resolution, clarify fallback on recursion failure, and that conversational and action prompts use the same `runAgent` code path (single last-message resolution branch).

#### Scenario: Mocked text path

- **WHEN** the mocked agent returns a final message without `tool_calls`
- **THEN** `runAgent` resolves to `{ kind: 'text', content }` matching that message content

#### Scenario: Mocked action path

- **WHEN** the mocked agent returns a final message with `tool_calls`
- **THEN** `runAgent` resolves action fields via the tools registry

## MODIFIED Requirements

### Requirement: Validated typed environment configuration

The system SHALL load environment variables (via dotenv) and validate them against a schema exactly once at startup in `src/config/env.ts`, exporting an immutable, fully typed `env` object. At minimum the schema SHALL define `NODE_ENV` (`development` | `production` | `test`, default `development`), `PORT` (coerced positive integer, default `3000`), and `AGENT_RUNTIME` (`legacy` | `langgraph`, default `legacy`).

#### Scenario: Valid environment

- **WHEN** the process starts with `PORT=4000`
- **THEN** `env.PORT` is the number `4000` and the application uses it for listening

#### Scenario: Invalid environment fails fast

- **WHEN** the process starts with an invalid value (e.g., `PORT=abc`)
- **THEN** the process exits immediately at startup with a readable validation error identifying the offending variable

#### Scenario: AGENT_RUNTIME defaults to legacy

- **WHEN** the process starts without `AGENT_RUNTIME` set
- **THEN** `env.AGENT_RUNTIME` is `legacy`

#### Scenario: AGENT_RUNTIME accepts langgraph

- **WHEN** the process starts with `AGENT_RUNTIME=langgraph`
- **THEN** `env.AGENT_RUNTIME` is `langgraph`

#### Scenario: Invalid AGENT_RUNTIME fails fast

- **WHEN** the process starts with `AGENT_RUNTIME=invalid`
- **THEN** the process exits immediately at startup with a readable validation error identifying `AGENT_RUNTIME`
