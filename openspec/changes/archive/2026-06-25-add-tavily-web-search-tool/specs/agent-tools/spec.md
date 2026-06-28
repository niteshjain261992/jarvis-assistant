## ADDED Requirements

### Requirement: Server-side tool support

The registry SHALL support two tool categories:

- **Client tools**: require `(ws: WebSocket, context?: ClientTaskPersistenceContext)`, built per-connection via `CLIENT_TOOL_FACTORIES`, delegate to mobile client via `requestFromClient`, and wrap with `withToolPersistence` when context is present.
- **Server tools**: require `(context?: ClientTaskPersistenceContext)`, built via `SERVER_TOOL_FACTORIES`, execute entirely on the backend, and wrap with `withToolPersistence` (executor `'server'`) when context is present.

Both categories SHALL be included in `buildToolsForConnection` output. Server tool factories SHALL NOT be forced into the `ClientToolFactory` type alias; they SHALL use a separate `ServerToolFactory` type alias.

#### Scenario: buildToolsForConnection returns client and server tools

- **WHEN** `buildToolsForConnection(mockWs, context)` is called
- **THEN** it returns exactly four definitions: three client tools and one server tool (`web_search`)
- **AND** the server tool has `executor: 'server'` and does not require a WebSocket to build
- **AND** server tool factories receive the same optional `context` argument as client tools

### Requirement: web_search tool

The system SHALL provide a `web_search` LangChain tool in `src/agent/tools/web-search.tool.ts` that calls the Tavily API server-side with no client delegation. The tool SHALL use `commandName: 'WEB:SEARCH'` and `executor: 'server'`. The factory SHALL be `buildWebSearchTool(context?: ClientTaskPersistenceContext)`. The handler SHALL wrap the Tavily call with `withToolPersistence(context, commandName, { query }, 'server', execute)` when context is present, or call Tavily directly when context is absent. The handler SHALL call Tavily with `maxResults: 3`, `searchDepth: 'basic'`, and `includeAnswer: true`. When Tavily returns an `answer`, the handler SHALL prefix the result with `Direct answer: {answer}\n\nSources:\n`. When no answer is present, the handler SHALL return sources only (title and content per result, plain text). Tavily failures SHALL propagate via `throwServerError` inside the execute lambda; `withToolPersistence` SHALL persist `status: 'failed'` before re-throwing when context is present. The tool description SHALL include every phrase in `webSearchMetadata.phrases` and SHALL explicitly instruct the model NOT to use the tool for general knowledge, conversation history, or date/time questions (answered from the system prompt). The handler SHALL NOT call `requestFromClient`. The handler SHALL return a plain `string` (not `ToolHandlerResult`) for LangGraph consumption.

#### Scenario: web_search returns Direct answer prefix when Tavily answer present

- **WHEN** `buildWebSearchTool(context)` handler is invoked and Tavily returns `{ answer: 'Sunny, 32°C', results: [{ title: 'Weather Delhi', content: '...' }] }`
- **THEN** the handler returns a string starting with `Direct answer: Sunny, 32°C`
- **AND** the string contains result titles and content

#### Scenario: web_search returns sources-only when answer absent

- **WHEN** `buildWebSearchTool(context)` handler is invoked and Tavily returns `{ results: [{ title: 'IPL Score', content: 'MI 180/4' }] }` with no `answer`
- **THEN** the handler returns a sources-only string containing titles and content
- **AND** the string does NOT contain `Direct answer:`

#### Scenario: web_search propagates SERVER_ERROR on Tavily failure

- **WHEN** `buildWebSearchTool(context)` handler is invoked and Tavily `search()` throws
- **THEN** `throwServerError` is called with a message containing `Tavily search failed`
- **AND** the error propagates out of the handler
- **AND** when context is provided, the action row is updated to `status: 'failed'`

#### Scenario: web_search persists pending action row when context provided

- **WHEN** `buildWebSearchTool(context)` handler is invoked with a valid `ClientTaskPersistenceContext`
- **THEN** `insertMessage` is called with `status: 'pending'`, `actionExecutor: 'server'`, and `actionName: 'WEB:SEARCH'` before Tavily is called

#### Scenario: web_search skips persistence without context

- **WHEN** `buildWebSearchTool()` handler is invoked without `context`
- **THEN** `insertMessage` is not called
- **AND** Tavily is still invoked for the search

#### Scenario: web_search description includes all local phrases

- **WHEN** `buildWebSearchTool()` is called
- **THEN** its LangChain description contains every phrase in `webSearchMetadata.phrases`

#### Scenario: web_search does not call requestFromClient

- **WHEN** `buildWebSearchTool(context)` handler is invoked with a valid query
- **THEN** `requestFromClient` is never called

#### Scenario: getToolByCommandName resolves WEB:SEARCH without WebSocket

- **WHEN** `getToolByCommandName('WEB:SEARCH')` is called
- **THEN** it returns `{ commandName: 'WEB:SEARCH', executor: 'server', toolName: 'web_search' }`

## MODIFIED Requirements

### Requirement: Tool registry and public API

The system SHALL expose a registry at `src/agent/tools/registry.ts` that aggregates client tool factories in `CLIENT_TOOL_FACTORIES` and server tool factories in `SERVER_TOOL_FACTORIES`, and provides `buildToolsForConnection(ws: WebSocket, context?: ClientTaskPersistenceContext): ToolDefinition[]` and `getToolByCommandName(commandName)` backed by static metadata exports. The registry SHALL export a `ClientToolFactory` type alias `(ws: WebSocket, context?: ClientTaskPersistenceContext) => ToolDefinition`, a `ServerToolFactory` type alias `(context?: ClientTaskPersistenceContext) => ToolDefinition`, and a `ClientTaskPersistenceContext` type in `types.ts` with fields `conversationId`, `userMessageId`, and `actionSequenceNumber` (imported from `tool-persistence.ts`). The only public import path for other modules SHALL be `src/agent/tools/index.ts`, which re-exports `buildToolsForConnection`, `getToolByCommandName`, `ClientToolFactory`, `ServerToolFactory`, `ClientTaskPersistenceContext`, `withToolPersistence`, shared types, and server tool exports (`buildWebSearchTool`, `webSearchMetadata`). Individual `*.tool.ts` files SHALL NOT be imported from outside the tools folder (except from tests under `tests/agent/tools/`).

#### Scenario: Per-connection structured tools for agent binding

- **WHEN** a consumer calls `buildToolsForConnection(ws, context)`
- **THEN** it receives a fresh `ToolDefinition[]` with one entry per registered tool (client and server), each client tool bound to the provided WebSocket and persistence context, and each server tool bound to the provided persistence context

#### Scenario: Reverse lookup by command name without WebSocket

- **WHEN** `getToolByCommandName('OFF:LIGHTS')` is called
- **THEN** it returns metadata for the tool whose `commandName` is `OFF:LIGHTS` without requiring a WebSocket argument

#### Scenario: Unknown command returns undefined

- **WHEN** `getToolByCommandName('UNKNOWN:NONE')` is called
- **THEN** it returns `undefined`

### Requirement: Agent tools unit tests under tests/

The change SHALL include Jest unit tests for the registry and each tool file under `tests/agent/tools/`. Tests SHALL verify factory-built handler return shapes (including client `ToolHandlerResult` and server string results), description phrase coverage, `buildToolsForConnection` counts, command-name lookup without WebSocket, duplicate-name assertion against metadata, error propagation on broker rejection, and that `requestFromClient` receives the tool's `clientTimeoutMs` without a context argument. When context is provided, tests SHALL verify `insertMessage` is called with `status: 'pending'` before execution. When context is absent, tests SHALL verify no action-row insert occurs. Play music tool tests SHALL cover explicit `platform`, default `youtube`, platform normalization, and CLIENT_TIMEOUT producing both a failed action row and a graceful tool result. Web search tool tests SHALL cover Tavily answer present/absent, error propagation via `throwServerError`, persistence with `actionExecutor: 'server'`, tool metadata shape, phrase coverage, negative instruction in description, and zero `requestFromClient` calls.

#### Scenario: Registry returns four tools per connection

- **WHEN** `buildToolsForConnection(mockWs)` is called
- **THEN** it returns exactly four definitions with expected LangChain tool names including `web_search`

#### Scenario: Tool names are valid identifiers

- **WHEN** each tool definition is built via its factory
- **THEN** its LangChain `tool.name` contains no colons and is a valid snake_case identifier

#### Scenario: Tests live under tests/agent/tools

- **WHEN** the agent tools test suite is listed
- **THEN** test files reside under `tests/agent/tools/` and not under `src/agent/tools/`
