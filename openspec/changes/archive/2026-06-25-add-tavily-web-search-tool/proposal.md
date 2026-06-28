## Why

Jarvis currently has only client-delegated tools (camera, lights, music). Users asking for current real-world information — weather, scores, news, prices — cannot be answered accurately from the LLM alone. A server-side web search tool powered by Tavily fills this gap without requiring mobile client changes or WebSocket delegation.

This change builds on two recently completed refactors:

- **extract-tool-persistence-wrapper**: Action-row persistence lives in `withToolPersistence` (`src/agent/tools/tool-persistence.ts`); the client-task broker handles WebSocket delegation only. Server tools use the same persistence lifecycle as client tools.
- **remove-dead-agent-action-branch**: `runAgent` returns only `{ kind: 'text' }` or `{ kind: 'clarify' }`; tool handlers execute inside the LangGraph loop and the agent's final `AIMessage` is what the pipeline persists as the assistant reply.

## What Changes

- Install `@tavily/core` dependency.
- Add `web_search` server-side LangChain tool (`src/agent/tools/web-search.tool.ts`) that calls Tavily directly and wraps execution with `withToolPersistence` when persistence context is present.
- Extend the tool registry with `SERVER_TOOL_FACTORIES` alongside `CLIENT_TOOL_FACTORIES`; `buildToolsForConnection` returns 4 tools (3 client + 1 server), passing `ClientTaskPersistenceContext` to both factory lists.
- Add required `TAVILY_API_KEY` env var (startup fails without it).
- Inject current IST date/time into `buildAgentSystemPrompt` so time/date questions are answered from context instead of triggering web search.
- Add unit tests for web search tool (including persistence), registry updates, and env validation.
- **BREAKING**: Server startup now requires `TAVILY_API_KEY` in environment (no default).

## Capabilities

### New Capabilities

_(none — web search extends existing agent-tools and app-config capabilities)_

### Modified Capabilities

- `agent-tools`: Add server-side tool category and `web_search` tool with `withToolPersistence`; registry returns 4 tools per connection.
- `app-config`: Add required `TAVILY_API_KEY` env var.
- `agent-runner`: System prompt includes current IST date/time to reduce unnecessary web search calls.

## Impact

- **Code**: `src/agent/tools/web-search.tool.ts` (new), `src/agent/tools/registry.ts`, `src/agent/tools/index.ts`, `src/config/env.ts`, `src/agent/agent-runner.ts`, `.env.example`
- **Tests**: `tests/agent/tools/web-search.tool.test.ts` (new), `tests/agent/tools/registry.test.ts`, `tests/config/env.test.ts`
- **Dependencies**: `@tavily/core` (npm); `withToolPersistence` from `src/agent/tools/tool-persistence.ts` (already implemented)
- **Secrets**: `TAVILY_API_KEY` required at startup
- **Non-impact**: WebSocket message contract, client-task-broker, mobile client unchanged; `AgentRunResult` shape unchanged (text/clarify only)
