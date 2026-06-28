## Why

LangChain tool definitions and registry exist under `src/agent/tools/`, but the live message pipeline still uses separate `classifyIntent` / `interpretCommand` Ollama HTTP calls. We need a LangGraph-based `runAgent` service that unifies conversation and tool-calling in one agent — tested and ready — while keeping the legacy pipeline as default via an env flag until a follow-up wires it into `message.service.ts`.

## What Changes

- Add `src/agent/agent-runner.ts` exporting `runAgent()` and `AgentRunResult` discriminated union (`text` | `action` | `clarify`)
- Wire `ChatOllama` + `createReactAgent` with tools from `@/agent/tools/index.js`
- System prompt reuses Jarvis persona from `CONVERSATION_SYSTEM_PROMPT` and explicitly prefers text over tool calls when uncertain
- Reuse conversation context filtering from `buildConversationPrompt` (no duplicated filter logic)
- Inspect the **last** message in agent state for `tool_calls` (not only tool-call messages)
- Add `AGENT_RUNTIME: 'legacy' | 'langgraph'` to `env.ts` (default `'legacy'`), documented in `.env.example`
- Add `tests/agent/agent-runner.test.ts` with mocked LangGraph/Ollama
- Extend `tests/config/env.test.ts` for `AGENT_RUNTIME` validation

## Capabilities

### New Capabilities

- `agent-runner`: LangGraph agent runner service with unified text/action/clarify results, bounded recursion, and tool resolution via the tools registry public API

### Modified Capabilities

- `app-config`: Add `AGENT_RUNTIME` enum env var with default `legacy`

## Impact

- **New files**: `src/agent/agent-runner.ts`, `tests/agent/agent-runner.test.ts`
- **Modified files**: `src/config/env.ts`, `.env.example`, `tests/config/env.test.ts`
- **Possible small additive export** in `ollama.service.ts` for shared context filtering (if needed to avoid duplicating filter logic)
- **Not affected**: `message.service.ts` (does not call `runAgent` yet), `classifyIntent`, `interpretCommand`, branch handlers
