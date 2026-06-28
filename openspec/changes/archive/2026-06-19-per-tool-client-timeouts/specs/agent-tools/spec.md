## MODIFIED Requirements

### Requirement: Locally authored LangChain tool definitions

The system SHALL provide LangChain tool definitions under `src/agent/tools/`, one file per supported command. Each tool file SHALL define its own `commandName`, `phrases`, `executor`, `payload`, and `clientTimeoutMs` as local constants exported as `*Metadata` — not loaded from `COMMAND_CATALOG` or `getCommandCatalogEntry`. The LangChain description SHALL be built from the local `phrases` array (phrase-anchored, not generalized). Client-executor tools SHALL be constructed via a factory function `(ws: WebSocket, context?: ClientTaskPersistenceContext) => ToolDefinition` that awaits a real client result through `requestFromClient(ws, commandName, payload, context, clientTimeoutMs)` before returning `{ commandName, executor, payload }` where `payload` includes the client `result`. Each `clientTimeoutMs` SHALL be a positive integer (milliseconds). Tool handler errors (timeout or client error) SHALL propagate without being swallowed. When persistence context is provided, it SHALL include `conversationId`, `userMessageId`, and `actionSequenceNumber` for action-row insertion — not the assistant placeholder id.

#### Scenario: Open camera tool awaits client result

- **WHEN** `buildOpenCameraTool(ws, context)` handler is invoked and the client responds successfully
- **THEN** it returns `commandName: 'OPEN:CAMERA'`, `executor: 'client'`, and `payload` containing `{ target: 'camera', result: <clientResult> }`
- **AND** `requestFromClient` was called with the same `context` argument including `userMessageId` and `actionSequenceNumber`
- **AND** `requestFromClient` was called with `openCameraMetadata.clientTimeoutMs` as the timeout argument

#### Scenario: Tool description includes local phrases

- **WHEN** the open camera tool definition is built via its factory
- **THEN** its LangChain description includes every phrase defined locally in that file (e.g. "open camera", "take a photo")

#### Scenario: Tool files do not import catalog

- **WHEN** any `*.tool.ts` file under `src/agent/tools/` is inspected
- **THEN** it does not import from `@/config/command-catalog.js`

#### Scenario: Client task failure propagates

- **WHEN** a client-executor tool handler's `requestFromClient` call rejects (timeout or client error)
- **THEN** the rejection propagates out of the tool handler without being caught inside the tool

#### Scenario: Each client tool declares clientTimeoutMs

- **WHEN** any `*.tool.ts` file that calls `requestFromClient` is inspected
- **THEN** its exported `*Metadata` includes a positive integer `clientTimeoutMs`

### Requirement: Agent tools unit tests under tests/

The change SHALL include Jest unit tests for the registry and each tool file under `tests/agent/tools/`. Tests SHALL verify factory-built handler return shapes (including client `result`), description phrase coverage, `buildToolsForConnection` counts, command-name lookup without WebSocket, duplicate-name assertion against metadata, error propagation on broker rejection, and that `requestFromClient` receives the tool's `clientTimeoutMs`. Jest SHALL discover these files via the standard `tests/` root when running `npm test`.

#### Scenario: Registry returns three tools per connection

- **WHEN** `buildToolsForConnection(mockWs)` is called
- **THEN** it returns exactly three definitions with expected LangChain tool names

#### Scenario: Tool names are valid identifiers

- **WHEN** each tool definition is built via its factory
- **THEN** its LangChain `tool.name` contains no colons and is a valid snake_case identifier

#### Scenario: Tests live under tests/agent/tools

- **WHEN** the agent tools test suite is listed
- **THEN** test files reside under `tests/agent/tools/` and not under `src/agent/tools/`
