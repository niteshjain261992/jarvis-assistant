## Context

All existing agent tools (`open_camera`, `off_lights`, `play_music`) are client-executor tools: they delegate to the mobile app via `requestFromClient` over WebSocket and wrap that call with `withToolPersistence` when `ClientTaskPersistenceContext` is available.

Users need current real-world information (weather, scores, news, prices) that the local LLM cannot answer reliably. Tavily provides a search API suited for LLM consumption. This is the first server-side tool — it executes entirely on the backend with no client involvement.

**Prerequisites (already implemented):**

- `withToolPersistence` in `src/agent/tools/tool-persistence.ts` — shared insert-pending → execute → update-completed/failed lifecycle for all tools.
- `requestFromClient` no longer accepts persistence context; broker is WebSocket-only.
- `runAgent` / `resolveAgentRunResult` return only `text` or `clarify` from the final `AIMessage`; no `kind: 'action'` path.

Existing patterns:

- Tool files export `*Metadata` and `build*Tool` factory returning `ToolDefinition`.
- Client tools: `(ws, context?) => ToolDefinition`; server tools: `(context?) => ToolDefinition` (no WebSocket).
- Env validation is centralized in `src/config/env.ts` (Zod); required keys fail at startup.
- Errors use `throwServerError` from `@/errors/index.js`.
- Tests mirror `src/` under `tests/` with Jest mocks for external deps.

## Goals / Non-Goals

**Goals:**

- Add `web_search` server-side LangChain tool calling Tavily API via `@tavily/core`.
- Wrap Tavily execution with `withToolPersistence(context, ..., 'server', execute)` when context is present — same pattern as client tools.
- Extend registry with `SERVER_TOOL_FACTORIES` accepting optional `ClientTaskPersistenceContext`.
- Require `TAVILY_API_KEY` at startup.
- Inject IST date/time into system prompt to avoid unnecessary web searches for time/date questions.
- Full unit test coverage for tool (including persistence), registry, and env validation.

**Non-Goals:**

- Client-side search or WebSocket delegation.
- Response caching, retry logic, or rate limiting (Tavily SDK handles retries).
- Markdown formatting in search results (plain text keeps LLM context lean).
- Changes to WebSocket message contract or client-task-broker.
- Reintroducing `AgentRunResult.kind: 'action'` or ToolMessage-based resolution.

## Decisions

### 1. Server tool factory pattern

Introduce `ServerToolFactory = (context?: ClientTaskPersistenceContext) => ToolDefinition` alongside `ClientToolFactory`. Server tools need persistence context but not a WebSocket.

`buildToolsForConnection` merges both:

```ts
const clientTools = CLIENT_TOOL_FACTORIES.map((f) => f(ws, context));
const serverTools = SERVER_TOOL_FACTORIES.map((f) => f(context));
return [...clientTools, ...serverTools];
```

**Alternative:** Plain `() => ToolDefinition` without context. Rejected — server tools must persist action rows via `withToolPersistence` when context is available.

### 2. Tool file shape

`web-search.tool.ts` follows the metadata + factory pattern but:

- Factory signature: `buildWebSearchTool(context?: ClientTaskPersistenceContext)`.
- Handler returns plain `string` (search result text for the LLM) — not `ToolHandlerResult`.
- Calls Tavily directly; never imports `requestFromClient`.
- Wraps Tavily call with `withToolPersistence` when context is present, passing `'server'` as executor.

```ts
const execute = () => tavilyClient.search(query, { maxResults: 3, searchDepth: 'basic', includeAnswer: true });
return context
  ? await withToolPersistence(context, webSearchMetadata.commandName, { query }, 'server', execute)
  : await execute();
```

On success, `withToolPersistence` stores the string result as `actionResult: { value: <string> }` (primitives are wrapped).

### 3. Tavily client initialization

Create Tavily client inside `buildWebSearchTool()` using `env.TAVILY_API_KEY`. Since the key is required at startup, no runtime missing-key check is needed in the handler.

Search options: `maxResults: 3`, `searchDepth: 'basic'`, `includeAnswer: true`.

Response formatting (inside handler, after Tavily returns):

- With answer: `Direct answer: {answer}\n\nSources:\n{title}\n{content}...`
- Without answer: sources only.

### 4. TAVILY_API_KEY as required env var

```ts
TAVILY_API_KEY: z.string().min(1),
```

No default — unlike `YOUTUBE_API_KEY` which is optional because play_music resolver checks at call time. Web search is always registered, so the key must be present at boot.

### 5. IST datetime in system prompt

Add to `buildAgentSystemPrompt`:

```ts
const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
// ... `Current date and time: ${now} (IST, Asia/Kolkata)`
```

Combined with web_search description explicitly saying NOT to use for date/time, this reduces spurious Tavily calls.

### 6. Error handling

Tavily failures caught in try/catch inside the `execute` lambda, re-thrown via `throwServerError('Tavily search failed: ...')`. `withToolPersistence` catches the error, persists `status: 'failed'`, and re-throws — same as client tools.

### 7. Agent result model (post-refactor)

`web_search` returns a string to the LangGraph loop as `ToolMessage` content. The LLM synthesizes a final `AIMessage`; `resolveAgentRunResult` reads that AIMessage and returns `{ kind: 'text', content }`. The message pipeline persists the assistant row as `type: 'text'`. Action rows for the search itself are written by `withToolPersistence` during tool execution — not by `runAgentTurn` action resolution.

### 8. Test strategy

- Mock `@tavily/core` — factory returns `{ search: jest.fn() }`.
- Mock `@/repositories/message.repository.js` for persistence tests.
- Mock `@/config/env.js` with `TAVILY_API_KEY: 'test-key'`.
- Spy on `throwServerError` for error propagation test.
- Spy on `requestFromClient` to assert zero calls.
- When context provided: assert `insertMessage` called with `status: 'pending'`, `actionExecutor: 'server'` before Tavily call.
- Mock `@/utils/logger.js` to suppress pino workers.

## Risks / Trade-offs

- **[Risk] Tavily API latency adds to agent response time** → **Mitigation:** `searchDepth: 'basic'` and `maxResults: 3` keep responses fast; agent `recursionLimit: 5` unchanged.
- **[Risk] Required API key breaks local dev without key** → **Mitigation:** Document in `.env.example`; devs must obtain a Tavily key.
- **[Risk] String tool result stored as `{ value: string }` in actionResult** → **Mitigation:** Consistent with `withToolPersistence` normalization for primitives; acceptable for action row audit trail.
- **[Risk] IST hardcoded** → **Mitigation:** Acceptable for v1 personal assistant; user is in India timezone context.

## Migration Plan

1. `npm install @tavily/core`
2. Add `TAVILY_API_KEY` to deployment `.env` and local `.env.example`
3. Deploy backend — no mobile client update required
4. Rollback: remove tool from registry and revert env requirement if needed

## Open Questions

- None — scope is well-defined for v1.
