## 1. Dependency and environment

- [x] 1.1 Run `npm install @tavily/core`
- [x] 1.2 Add required `TAVILY_API_KEY: z.string().min(1)` to `src/config/env.ts` (no default, same pattern as `MONGODB_URI` without default fallback)
- [x] 1.3 Add `TAVILY_API_KEY=` placeholder to `.env.example` with comment noting it is required

## 2. Web search tool

- [x] 2.1 Create `src/agent/tools/web-search.tool.ts` with `webSearchMetadata`, `buildWebSearchTool(context?)`, Tavily client, phrase-anchored description, negative instruction for general knowledge/date-time, and `throwServerError` on failure
- [x] 2.2 Wrap Tavily call with `withToolPersistence(context, commandName, { query }, 'server', execute)` when context is present; call Tavily directly when context is absent
- [x] 2.3 Format Tavily response: `Direct answer:` prefix when answer present, sources-only otherwise (plain text, max 3 results)

## 3. Registry and exports

- [x] 3.1 Add `ServerToolFactory` type alias `(context?: ClientTaskPersistenceContext) => ToolDefinition` in `src/agent/tools/types.ts`
- [x] 3.2 Add `webSearchMetadata` entry to `TOOL_METADATA` in `src/agent/tools/registry.ts`
- [x] 3.3 Add `SERVER_TOOL_FACTORIES` with `buildWebSearchTool`; update `buildToolsForConnection` to merge client tools (`f(ws, context)`) and server tools (`f(context)`)
- [x] 3.4 Re-export `buildWebSearchTool` and `webSearchMetadata` from `src/agent/tools/index.ts`

## 4. Agent system prompt

- [x] 4.1 Update `buildAgentSystemPrompt` in `src/agent/agent-runner.ts` to inject current IST date/time via `toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })`

## 5. Unit tests — web search tool

- [x] 5.1 Create `tests/agent/tools/web-search.tool.test.ts` with mocks for `@tavily/core`, `@/repositories/message.repository.js`, `@/config/env.js`, `@/errors/index.js`, and `@/utils/logger.js`
- [x] 5.2 Test: Tavily returns answer → result starts with `Direct answer:` and contains titles/content
- [x] 5.3 Test: Tavily returns no answer → sources-only, no `Direct answer:` prefix
- [x] 5.4 Test: Tavily throws → `throwServerError` called with `Tavily search failed`, error propagates; when context provided, action row updated to `failed`
- [x] 5.5 Test: `buildWebSearchTool()` return shape (`WEB:SEARCH`, `server`, `web_search`)
- [x] 5.6 Test: description contains every phrase in `webSearchMetadata.phrases`
- [x] 5.7 Test: description contains `do NOT use` negative instruction
- [x] 5.8 Test: handler does not call `requestFromClient`
- [x] 5.9 Test: when context provided, `insertMessage` called with `status: 'pending'` and `actionExecutor: 'server'` before Tavily call; when context absent, no insert

## 6. Unit tests — registry and env

- [x] 6.1 Update `tests/agent/tools/registry.test.ts`: expect 4 tools, include `web_search` with `executor: 'server'`, add `getToolByCommandName('WEB:SEARCH')` assertion
- [x] 6.2 Update `tests/config/env.test.ts`: add `TAVILY_API_KEY` to `ENV_KEYS`, test missing key fails validation; contrast with optional `YOUTUBE_API_KEY` behavior if applicable

## 7. Verification

- [x] 7.1 Run `npm test` and confirm all tests pass with coverage above 90% gate
- [x] 7.2 Confirm server refuses to start without `TAVILY_API_KEY` (env validation)
