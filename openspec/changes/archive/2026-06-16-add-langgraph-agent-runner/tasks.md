## 1. Environment configuration

- [x] 1.1 Add `AGENT_RUNTIME: z.enum(['legacy', 'langgraph']).default('legacy')` to `src/config/env.ts`
- [x] 1.2 Document `AGENT_RUNTIME` in `.env.example`
- [x] 1.3 Extend `tests/config/env.test.ts` — default `legacy`, accepts `langgraph`, rejects invalid values (match existing enum test style)

## 2. Shared conversation helpers (minimal ollama.service export)

- [x] 2.1 Export `filterCompletedContextMessages(context: MessageDocument[])` from `ollama.service.ts` using the same filter as `buildConversationPrompt` (refactor `buildConversationPrompt` to call it internally)
- [x] 2.2 Export `CONVERSATION_SYSTEM_PROMPT` (or `JARVIS_PERSONA_PROMPT`) for reuse in agent-runner system prompt

## 3. Agent runner implementation

- [x] 3.1 Create `src/agent/agent-runner.ts` with `AgentRunResult` discriminated union types
- [x] 3.2 Implement `runAgent()` — ChatOllama from env, `getStructuredTools()` from `@/agent/tools/index.js`, `createReactAgent` with system prompt (persona + prefer-text-over-tools policy + optional summary)
- [x] 3.3 Build LangChain messages from filtered context + current prompt (`HumanMessage`/`AIMessage` by role)
- [x] 3.4 Invoke with `recursionLimit: 5`; read **last** message in state; branch on non-empty `tool_calls` vs text content
- [x] 3.5 Resolve tool calls via registry (`getToolByCommandName` or lookup by `tool.name` on registered definitions) → `{ kind: 'action', actionName, actionExecutor, actionPayload }`
- [x] 3.6 On graph throw or unusable final message → `{ kind: 'clarify', content: <fallback> }`

## 4. Unit tests

- [x] 4.1 Create `tests/agent/agent-runner.test.ts` — mock `@langchain/ollama` and `@langchain/langgraph/prebuilt` following `ollama.service.test.ts` conventions
- [x] 4.2 Test: no `tool_calls` on last message → `{ kind: 'text', content }` exact match
- [x] 4.3 Test: `tool_calls` on last message → `{ kind: 'action', ... }` with correct registry resolution
- [x] 4.4 Test: recursionLimit exceeded / invoke throws → `{ kind: 'clarify', ... }`
- [x] 4.5 Test: conversational and action prompts both use same `runAgent` path (single last-message resolution, no input-based branching)
- [x] 4.6 Run `npm test` — all pass with coverage gate

## 5. Manual verification (before merge)

- [x] 5.1 Confirm via tests (or optional local script) that action phrasing maps to `kind: 'action'` and conversational phrasing maps to `kind: 'text'` — do not merge with known category misfires

## Out of scope (do not do)

- Do not call `runAgent` from `message.service.ts`
- Do not read `AGENT_RUNTIME` outside env validation/tests
- Do not modify `classifyIntent`, `interpretCommand`, or branch handlers
- Do not import from `src/agent/tools/*.tool.ts` directly
