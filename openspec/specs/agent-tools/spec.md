# agent-tools Specification

## Purpose

Define LangChain tool definitions and a registry under `src/agent/tools/` for agent-based command resolution, with locally authored metadata per tool and a public barrel export for downstream agent wiring.

## Requirements

### Requirement: Locally authored LangChain tool definitions

The system SHALL provide LangChain tool definitions under `src/agent/tools/`, one file per supported command. Each tool file SHALL define its own `commandName`, `phrases`, `executor`, `payload`, and `clientTimeoutMs` as local constants exported as `*Metadata` — not loaded from `COMMAND_CATALOG` or `getCommandCatalogEntry`. The LangChain description SHALL be built from the local `phrases` array (phrase-anchored, not generalized). Client-executor tools SHALL be constructed via a factory function `(ws: WebSocket, context?: ClientTaskPersistenceContext) => ToolDefinition` that awaits a real client result through `requestFromClient(ws, commandName, payload, clientTimeoutMs)` before returning `{ commandName, executor, payload }` where `payload` includes the client `result`. When `context` is provided, client tools SHALL wrap the `requestFromClient` call with `withToolPersistence` from `src/agent/tools/tool-persistence.ts`, passing the tool's `commandName`, payload, and `'client'` as `actionExecutor`. When `context` is omitted, tools SHALL call `requestFromClient` directly without persistence. Each `clientTimeoutMs` SHALL be a positive integer (milliseconds). Tool handler errors (timeout or client error) SHALL propagate without being swallowed, **except** that the `play_music` tool (`PLAY:MUSIC`) SHALL use `handleJarvisError` from `src/errors/` to catch `JarvisError` with `type === 'CLIENT_TIMEOUT'` and return a successful `ToolHandlerResult` with resolved URL fields and `payload.result` including `status: 'client_timeout'`, `type: 'CLIENT_TIMEOUT'`, and `message`. The `play_music` try/catch for `handleJarvisError` SHALL wrap the `withToolPersistence` call (not the inner `execute` lambda) so that CLIENT_TIMEOUT persists a failed action row and still returns a graceful tool result. Play-music resolver and platform code SHALL throw `JarvisError` with `type === 'SERVER_ERROR'` via `throwServerError` instead of plain `Error`. Client and server tools SHALL use `withToolPersistence` to insert a pending action row before execution and update it to completed or failed after. The broker (`requestFromClient`) is responsible only for WebSocket delegation, not persistence. The `play_music` tool SHALL accept LangChain schema fields `query` (required string) and `platform` (string defaulting to `youtube`). Before delegating to the client, the handler SHALL call `resolvePlayMusicUrl(query, platform)` and SHALL include `url` and resolved metadata (`title`, `id` when available) in the client payload along with `query` and normalized `platform`.

#### Scenario: Open camera tool awaits client result

- **WHEN** `buildOpenCameraTool(ws, context)` handler is invoked and the client responds successfully
- **THEN** it returns `commandName: 'OPEN:CAMERA'`, `executor: 'client'`, and `payload` containing `{ target: 'camera', result: <clientResult> }`
- **AND** when `context` is provided, `withToolPersistence` inserts a pending action row before `requestFromClient` is called
- **AND** `requestFromClient` was called with `openCameraMetadata.clientTimeoutMs` as the timeout argument and without a context argument

#### Scenario: Open camera tool skips persistence without context

- **WHEN** `buildOpenCameraTool(ws)` handler is invoked without `context`
- **THEN** `insertMessage` is not called for action persistence
- **AND** `requestFromClient` is still invoked for client delegation

#### Scenario: Play music tool resolves URL before client delegation

- **WHEN** `buildPlayMusicTool(ws, context)` handler is invoked with `{ query: 'Bollywood party songs', platform: 'spotify' }`, the resolver returns `{ url: 'spotify:track:abc', title: 'Song', id: 'abc' }`, and the client responds successfully
- **THEN** it returns `commandName: 'PLAY:MUSIC'` with `payload` containing `query`, `platform: 'spotify'`, `url`, `title`, `id`, and `result: <clientResult>`
- **AND** `requestFromClient` was called with payload including `{ query: 'Bollywood party songs', platform: 'spotify', url: 'spotify:track:abc', title: 'Song', id: 'abc' }`

#### Scenario: Play music tool defaults platform to youtube

- **WHEN** `buildPlayMusicTool(ws, context)` handler is invoked with `{ query: 'romantic songs' }` and no explicit platform
- **THEN** `resolvePlayMusicUrl` is called with platform `youtube`
- **AND** `requestFromClient` was called with payload including `platform: 'youtube'` and a resolved `url`

#### Scenario: Play music tool handles client timeout via centralized handler

- **WHEN** `buildPlayMusicTool(ws, context)` handler is invoked, the resolver succeeds, and `requestFromClient` rejects with `JarvisError` `type === 'CLIENT_TIMEOUT'`
- **THEN** the handler returns `commandName: 'PLAY:MUSIC'` without throwing
- **AND** `payload` includes the resolved `url`, `query`, and `platform`
- **AND** `payload.result` includes `status: 'client_timeout'`, `type: 'CLIENT_TIMEOUT'`, and the error message
- **AND** when `context` is provided, the action row is updated to `status: 'failed'` before the graceful result is returned

#### Scenario: Play music server errors propagate

- **WHEN** `buildPlayMusicTool(ws, context)` handler is invoked and `resolvePlayMusicUrl` throws `JarvisError` with `type === 'SERVER_ERROR'`
- **THEN** the error propagates out of the tool handler without being caught inside the tool

#### Scenario: Play music client errors propagate

- **WHEN** `buildPlayMusicTool(ws, context)` handler is invoked, the resolver succeeds, and `requestFromClient` rejects with `JarvisError` `type === 'CLIENT_ERROR'`
- **THEN** the rejection propagates out of the tool handler without being caught inside the tool

#### Scenario: Tool description includes local phrases

- **WHEN** the open camera tool definition is built via its factory
- **THEN** its LangChain description includes every phrase defined locally in that file (e.g. "open camera", "take a photo")

#### Scenario: Tool files do not import catalog

- **WHEN** any `*.tool.ts` file under `src/agent/tools/` is inspected
- **THEN** it does not import from `@/config/command-catalog.js`

#### Scenario: Client task failure propagates for other tools

- **WHEN** a client-executor tool handler's `requestFromClient` call rejects (timeout or client error) and the tool is not `play_music`
- **THEN** the rejection propagates out of the tool handler without being caught inside the tool

#### Scenario: Each client tool declares clientTimeoutMs

- **WHEN** any `*.tool.ts` file that calls `requestFromClient` is inspected
- **THEN** its exported `*Metadata` includes a positive integer `clientTimeoutMs`

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

### Requirement: Uniqueness enforcement

The registry SHALL throw at module load if any two tool metadata entries share the same LangChain tool name or the same `commandName`. Uniqueness SHALL be asserted against the static metadata table, not against a built tool array.

#### Scenario: Duplicate tool name fails fast

- **WHEN** the registry metadata table contains two entries whose LangChain tool names are identical
- **THEN** module load throws an error describing the duplicate name

#### Scenario: Duplicate command name fails fast

- **WHEN** the registry metadata table contains two entries whose `commandName` values are identical
- **THEN** module load throws an error describing the duplicate command name

### Requirement: Agent tools unit tests under tests/

The change SHALL include Jest unit tests for the registry and each tool file under `tests/agent/tools/`. Tests SHALL verify factory-built handler return shapes (including client `ToolHandlerResult` and server string results), description phrase coverage, `buildToolsForConnection` counts, command-name lookup without WebSocket, duplicate-name assertion against metadata, error propagation on broker rejection, and that `requestFromClient` receives the tool's `clientTimeoutMs` without a context argument. When context is provided, tests SHALL verify `insertMessage` is called with `status: 'pending'` before execution. When context is absent, tests SHALL verify no action-row insert occurs. Play music tool tests SHALL cover explicit `platform`, default `youtube`, platform normalization, and CLIENT_TIMEOUT producing both a failed action row and a graceful tool result. Web search tool tests SHALL cover Tavily answer present/absent, error propagation via `throwServerError`, persistence with `actionExecutor: 'server'`, tool metadata shape, phrase coverage, negative instruction in description, and zero `requestFromClient` calls. Each tool's test file SHALL additionally assert that its exported `*Metadata` includes a `freshness` object with the expected `refetchRequired` value. `tests/agent/tools/registry.test.ts` SHALL additionally assert that `getToolFreshnessRules()` returns an entry for every registered tool, that the `web_search` entry has `refetchRequired: true` with a non-empty `reason`, and that each device tool (`open_camera`, `off_lights`, `play_music`) has `refetchRequired: true`.

#### Scenario: Registry returns four tools per connection

- **WHEN** `buildToolsForConnection(mockWs)` is called
- **THEN** it returns exactly four definitions with expected LangChain tool names including `web_search`

#### Scenario: Tool names are valid identifiers

- **WHEN** each tool definition is built via its factory
- **THEN** its LangChain `tool.name` contains no colons and is a valid snake_case identifier

#### Scenario: Tests live under tests/agent/tools

- **WHEN** the agent tools test suite is listed
- **THEN** test files reside under `tests/agent/tools/` and not under `src/agent/tools/`

#### Scenario: getToolFreshnessRules returns an entry per registered tool

- **WHEN** `getToolFreshnessRules()` is called in `tests/agent/tools/registry.test.ts`
- **THEN** the returned array has one entry per tool in `TOOL_METADATA`, each with `refetchRequired` and a non-empty `reason`

#### Scenario: Each tool test asserts freshness metadata

- **WHEN** a tool's `*.tool.test.ts` file is run
- **THEN** it asserts the tool's exported `*Metadata.freshness.refetchRequired` matches the expected value for that tool

### Requirement: Tool freshness declaration

The system SHALL define a shared `ToolFreshness` type in `src/agent/tools/types.ts` with fields `refetchRequired: boolean` and `reason: string`. Every tool's exported `*Metadata` object (`webSearchMetadata`, `openCameraMetadata`, `offLightsMetadata`, `playMusicMetadata`) SHALL include a required `freshness: ToolFreshness` field — the field SHALL NOT be optional, so a tool file cannot omit it. `web_search`, `open_camera`, `off_lights`, and `play_music` SHALL each declare `refetchRequired: true` with a non-empty `reason` describing why the tool's result must not be reused from conversation history (time-sensitive data for `web_search`; a repeatable device action for the other three). The `ToolFreshness` type SHALL be structured so that an optional `ttlMinutes?: number` field can be added later without changing `refetchRequired` or `reason`.

#### Scenario: web_search declares refetch-required freshness

- **WHEN** `webSearchMetadata` is inspected
- **THEN** it includes `freshness: { refetchRequired: true, reason: <non-empty string> }`

#### Scenario: Device tools declare refetch-required freshness

- **WHEN** `openCameraMetadata`, `offLightsMetadata`, or `playMusicMetadata` is inspected
- **THEN** each includes `freshness: { refetchRequired: true, reason: <non-empty string> }`

### Requirement: Registry exposes tool freshness rules

The registry (`src/agent/tools/registry.ts`) SHALL export a function `getToolFreshnessRules(): Array<{ toolName: string; refetchRequired: boolean; reason: string }>` that returns one entry per entry in the same `TOOL_METADATA` table already used for command-name and tool-name lookups. The function SHALL NOT read from a separately maintained list — it SHALL be derived from `TOOL_METADATA` so that adding, removing, or changing a tool's freshness automatically reflects in the returned rules. `getToolFreshnessRules` SHALL be re-exported from `src/agent/tools/index.ts` alongside the other public registry functions.

#### Scenario: getToolFreshnessRules reflects all registered tools

- **WHEN** `getToolFreshnessRules()` is called
- **THEN** it returns exactly one entry per tool in `TOOL_METADATA`, each with `toolName`, `refetchRequired`, and `reason`

#### Scenario: getToolFreshnessRules stays in sync with the metadata table

- **WHEN** a tool's `freshness` value in its `*Metadata` object changes
- **THEN** `getToolFreshnessRules()` reflects the change without any other code being updated
