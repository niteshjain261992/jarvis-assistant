## MODIFIED Requirements

### Requirement: Locally authored LangChain tool definitions

The system SHALL provide LangChain tool definitions under `src/agent/tools/`, one file per supported command. Each tool file SHALL define its own `commandName`, `phrases`, `executor`, `payload`, and `clientTimeoutMs` as local constants exported as `*Metadata` — not loaded from `COMMAND_CATALOG` or `getCommandCatalogEntry`. The LangChain description SHALL be built from the local `phrases` array (phrase-anchored, not generalized). Client-executor tools SHALL be constructed via a factory function `(ws: WebSocket, context?: ClientTaskPersistenceContext) => ToolDefinition` that awaits a real client result through `requestFromClient(ws, commandName, payload, context, clientTimeoutMs)` before returning `{ commandName, executor, payload }` where `payload` includes the client `result`. Each `clientTimeoutMs` SHALL be a positive integer (milliseconds). Tool handler errors (timeout or client error) SHALL propagate without being swallowed, **except** that the `play_music` tool (`PLAY:MUSIC`) MAY catch client task timeout errors from `requestFromClient` and return a successful `ToolHandlerResult` with resolved URL fields and `payload.result` set to `{ status: 'client_timeout', message: string }`. When persistence context is provided, it SHALL include `conversationId`, `userMessageId`, and `actionSequenceNumber` for action-row insertion — not the assistant placeholder id. The `play_music` tool SHALL accept LangChain schema fields `query` (required string) and `platform` (string defaulting to `youtube`). Before delegating to the client, the handler SHALL call `resolvePlayMusicUrl(query, platform)` and SHALL include `url` and resolved metadata (`title`, `id` when available) in the client payload along with `query` and normalized `platform`.

#### Scenario: Open camera tool awaits client result

- **WHEN** `buildOpenCameraTool(ws, context)` handler is invoked and the client responds successfully
- **THEN** it returns `commandName: 'OPEN:CAMERA'`, `executor: 'client'`, and `payload` containing `{ target: 'camera', result: <clientResult> }`
- **AND** `requestFromClient` was called with the same `context` argument including `userMessageId` and `actionSequenceNumber`
- **AND** `requestFromClient` was called with `openCameraMetadata.clientTimeoutMs` as the timeout argument

#### Scenario: Play music tool resolves URL before client delegation

- **WHEN** `buildPlayMusicTool(ws, context)` handler is invoked with `{ query: 'Bollywood party songs', platform: 'spotify' }`, the resolver returns `{ url: 'spotify:track:abc', title: 'Song', id: 'abc' }`, and the client responds successfully
- **THEN** it returns `commandName: 'PLAY:MUSIC'` with `payload` containing `query`, `platform: 'spotify'`, `url`, `title`, `id`, and `result: <clientResult>`
- **AND** `requestFromClient` was called with payload including `{ query: 'Bollywood party songs', platform: 'spotify', url: 'spotify:track:abc', title: 'Song', id: 'abc' }`

#### Scenario: Play music tool defaults platform to youtube

- **WHEN** `buildPlayMusicTool(ws, context)` handler is invoked with `{ query: 'romantic songs' }` and no explicit platform
- **THEN** `resolvePlayMusicUrl` is called with platform `youtube`
- **AND** `requestFromClient` is called with payload including `platform: 'youtube'` and a resolved `url`

#### Scenario: Play music tool handles client timeout gracefully

- **WHEN** `buildPlayMusicTool(ws, context)` handler is invoked, the resolver succeeds, and `requestFromClient` rejects with `Client task timed out after 10000ms`
- **THEN** the handler returns `commandName: 'PLAY:MUSIC'` without throwing
- **AND** `payload` includes the resolved `url`, `query`, and `platform`
- **AND** `payload.result` equals `{ status: 'client_timeout', message: 'Client task timed out after 10000ms' }`

#### Scenario: Play music resolver failure propagates

- **WHEN** `buildPlayMusicTool(ws, context)` handler is invoked and `resolvePlayMusicUrl` throws (missing API key, empty search results, or unsupported platform)
- **THEN** the error propagates out of the tool handler without being caught inside the tool

#### Scenario: Play music non-timeout client error propagates

- **WHEN** `buildPlayMusicTool(ws, context)` handler is invoked, the resolver succeeds, and `requestFromClient` rejects with a non-timeout error (e.g. `Playback failed`)
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
