## MODIFIED Requirements

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
- **AND** `requestFromClient` is called with payload including `platform: 'youtube'` and a resolved `url`

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

### Requirement: Tool registry and public API

The system SHALL expose a registry at `src/agent/tools/registry.ts` that aggregates client tool factories and provides `buildToolsForConnection(ws: WebSocket, context?: ClientTaskPersistenceContext): ToolDefinition[]` and `getToolByCommandName(commandName)` backed by static metadata exports. The registry SHALL export a `ClientToolFactory` type alias `(ws: WebSocket, context?: ClientTaskPersistenceContext) => ToolDefinition` and a `ClientTaskPersistenceContext` type in `types.ts` with fields `conversationId`, `userMessageId`, and `actionSequenceNumber` (imported from `tool-persistence.ts`). The only public import path for other modules SHALL be `src/agent/tools/index.ts`, which re-exports `buildToolsForConnection`, `getToolByCommandName`, `ClientToolFactory`, `ClientTaskPersistenceContext`, `withToolPersistence`, and shared types. Individual `*.tool.ts` files SHALL NOT be imported from outside the tools folder (except from tests under `tests/agent/tools/`).

#### Scenario: Per-connection structured tools for agent binding

- **WHEN** a consumer calls `buildToolsForConnection(ws, context)`
- **THEN** it receives a fresh `ToolDefinition[]` with one entry per registered client tool, each bound to the provided WebSocket and persistence context

#### Scenario: Reverse lookup by command name without WebSocket

- **WHEN** `getToolByCommandName('OFF:LIGHTS')` is called
- **THEN** it returns metadata for the tool whose `commandName` is `OFF:LIGHTS` without requiring a WebSocket argument

#### Scenario: Unknown command returns undefined

- **WHEN** `getToolByCommandName('UNKNOWN:NONE')` is called
- **THEN** it returns `undefined`

### Requirement: Agent tools unit tests under tests/

The change SHALL include Jest unit tests for the registry and each tool file under `tests/agent/tools/`. Tests SHALL verify factory-built handler return shapes (including client `result`), description phrase coverage, `buildToolsForConnection` counts, command-name lookup without WebSocket, duplicate-name assertion against metadata, error propagation on broker rejection, and that `requestFromClient` receives the tool's `clientTimeoutMs` without a context argument. When context is provided, tests SHALL verify `insertMessage` is called with `status: 'pending'` before `requestFromClient`. When context is absent, tests SHALL verify no action-row insert occurs. Play music tool tests SHALL cover explicit `platform`, default `youtube`, platform normalization, and CLIENT_TIMEOUT producing both a failed action row and a graceful tool result.

#### Scenario: Registry returns three tools per connection

- **WHEN** `buildToolsForConnection(mockWs)` is called
- **THEN** it returns exactly three definitions with expected LangChain tool names

#### Scenario: Tool names are valid identifiers

- **WHEN** each tool definition is built via its factory
- **THEN** its LangChain `tool.name` contains no colons and is a valid snake_case identifier

#### Scenario: Tests live under tests/agent/tools

- **WHEN** the agent tools test suite is listed
- **THEN** test files reside under `tests/agent/tools/` and not under `src/agent/tools/`
