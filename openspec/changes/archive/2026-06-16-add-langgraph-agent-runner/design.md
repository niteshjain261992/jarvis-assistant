## Context

Jarvis handles messages via `message.service.ts` → `ollama.service.ts` (`classifyIntent`, `generateConversationResponse`, `interpretCommand`). The prototype script proved llama3.1 can tool-call, but called tools on every prompt without a strong "prefer text" system instruction.

`src/agent/tools/` provides `getStructuredTools()` and `getToolByCommandName()` via `index.ts`. This change adds `runAgent()` — a LangGraph ReAct runner that returns structured results for a future pipeline switch, gated by `AGENT_RUNTIME` (default `legacy`, unread by production code until next chunk).

## Goals / Non-Goals

**Goals:**

- `runAgent({ prompt, context, summary? })` → `AgentRunResult`
- Single code path: always read last message in state, branch on `tool_calls`
- System prompt: Jarvis persona + "most requests are conversational; only call tools when clearly matched; when unsure, answer with text"
- Context: same completed-with-content filter as `buildConversationPrompt`
- `recursionLimit: 5`; clarify fallback on graph failure / unusable final state
- Tool resolution via `@/agent/tools/index.js` only
- `AGENT_RUNTIME` env var validated in `env.ts`
- Full unit test coverage with mocks (no live Ollama in CI)

**Non-Goals:**

- Calling `runAgent` from `message.service.ts`
- Reading `AGENT_RUNTIME` in production pipeline
- Modifying `classifyIntent`, `interpretCommand`, or branch handlers
- Direct imports from `*.tool.ts` files

## Decisions

### 1. `AgentRunResult` discriminated union

**Choice:**

```typescript
type AgentRunResult =
  | { kind: 'text'; content: string }
  | { kind: 'action'; actionName: string; actionExecutor: 'client' | 'server'; actionPayload: Record<string, unknown> }
  | { kind: 'clarify'; content: string };
```

**Rationale:** Maps cleanly to future message pipeline branches; `action*` fields align with existing action message shape.

### 2. Last-message inspection (not tool-call-only scan)

**Choice:** After `agent.invoke`, take `messages[messages.length - 1]`. If it has non-empty `tool_calls`, resolve action; else extract text `content`.

**Rationale:** ReAct loop ends with AIMessage text for conversational turns; scanning only tool-call messages drops valid text responses.

### 3. Tool resolution via registry

**Choice:** For each tool call on the last message, map LangChain `tool.name` (e.g. `open_camera`) to registry entry via `getAllTools().find(d => d.tool.name === name)` or convert to command name for `getToolByCommandName`. Prefer lookup by `tool.name` against registered definitions (reliable); populate `actionName` from `definition.commandName`, `actionExecutor` and `actionPayload` from definition metadata / handler result.

**Rationale:** `getToolByCommandName` expects `OPEN:CAMERA` format; tool calls use snake_case names. Lookup by `tool.name` avoids brittle string conversion; still satisfies "via registry" requirement.

**Alternative:** `open_camera` → `OPEN:CAMERA` string conversion — works today but fragile.

### 4. System prompt (`prompt` on createReactAgent)

**Choice:** Use `prompt` parameter (current LangGraph API; replaces deprecated `messageModifier`) as a multi-line system string:

- Line 1–2: same persona as `CONVERSATION_SYSTEM_PROMPT` from `ollama.service.ts` (extract shared constant or duplicate verbatim two sentences — prefer **export** `JARVIS_PERSONA_PROMPT` from ollama.service to avoid drift)
- Explicit tool-use policy paragraph (required by user)
- Optional rolling summary injected when `summary` provided

**Rationale:** Prototype misfired without "prefer text" instruction.

### 5. Context message building

**Choice:** Export `filterCompletedContextMessages(context: MessageDocument[])` from `ollama.service.ts` encapsulating `.filter(m => m.content && m.status === 'completed')`. `agent-runner.ts` maps filtered messages to `HumanMessage` / `AIMessage` by `role`, then appends `HumanMessage(prompt)`.

**Rationale:** User requires reusing filter logic without duplicating; small additive export does not alter classify/interpret behavior.

**Alternative:** Duplicate one-line filter — rejected.

### 6. ChatOllama configuration

**Choice:** `baseUrl: env.OLLAMA_BASE_URL.toString()`, `model: env.OLLAMA_MODEL`, `temperature: 0` (aligned with command interpretation).

### 7. recursionLimit and clarify fallback

**Choice:** Pass `{ recursionLimit: 5 }` to `invoke`. On throw or empty/unparseable last message → `{ kind: 'clarify', content: 'I couldn't process that. Could you rephrase?' }` (fixed fallback string).

### 8. AGENT_RUNTIME env var

**Choice:** `z.enum(['legacy', 'langgraph']).default('legacy')` in existing `envSchema`; document in `.env.example`. Not read by `agent-runner` or `message.service` in this change — only validated and tested.

### 9. Test mocking strategy

**Choice:** `jest.mock('@langchain/ollama')` and `jest.mock('@langchain/langgraph/prebuilt')` (or mock internal factory) following `ollama.service.test.ts` fetch-mock pattern. Mock `createReactAgent` to return `{ invoke: jest.fn() }` returning controlled message arrays.

**Rationale:** No network; deterministic branches for text/action/clarify.

### 10. Same code path assertion

**Choice:** Single test spy on internal `resolveAgentResult(lastMessage)` (or assert both conversational and action mocks return via same `invoke` mock path with different last messages).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Model still over-calls tools in production | Strong system prompt; manual sanity check before merge; unit tests mock behavior |
| LangGraph API drift (`prompt` vs `messageModifier`) | Use current `@langchain/langgraph` prebuilt API |
| Export from ollama.service expands surface | Minimal export: filter helper + optional persona constant |
| AGENT_RUNTIME unused until next chunk | Documented; tested in env.test.ts only |

## Migration Plan

1. Add env var + `.env.example`
2. Export context filter (and optionally persona) from ollama.service
3. Implement agent-runner.ts
4. Add tests; run `npm test`
5. Manual sanity via tests (mocked) — live Ollama optional local check
6. Next chunk: message.service reads `AGENT_RUNTIME` and calls `runAgent`

## Open Questions

None — requirements fully specified.
