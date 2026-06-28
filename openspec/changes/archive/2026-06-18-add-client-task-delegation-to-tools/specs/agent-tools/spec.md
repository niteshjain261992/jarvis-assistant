## MODIFIED Requirements

### Requirement: Locally authored LangChain tool definitions

The system SHALL provide LangChain tool definitions under `src/agent/tools/`, one file per supported command. Each tool file SHALL define its own `commandName`, `phrases`, `executor`, and `payload` as local constants exported as `*Metadata` — not loaded from `COMMAND_CATALOG` or `getCommandCatalogEntry`. The LangChain description SHALL be built from the local `phrases` array (phrase-anchored, not generalized). Client-executor tools SHALL be constructed via a factory function `(ws: WebSocket) => ToolDefinition` that awaits a real client result through `requestFromClient` before returning `{ commandName, executor, payload }` where `payload` includes the client `result`. Tool handler errors (timeout or client error) SHALL propagate without being swallowed.

#### Scenario: Open camera tool awaits client result

- **WHEN** `buildOpenCameraTool(ws)` handler is invoked and the client responds successfully
- **THEN** it returns `commandName: 'OPEN:CAMERA'`, `executor: 'client'`, and `payload` containing `{ target: 'camera', result: <clientResult> }`

#### Scenario: Tool description includes local phrases

- **WHEN** the open camera tool definition is built via its factory
- **THEN** its LangChain description includes every phrase defined locally in that file (e.g. "open camera", "take a photo")

#### Scenario: Tool files do not import catalog

- **WHEN** any `*.tool.ts` file under `src/agent/tools/` is inspected
- **THEN** it does not import from `@/config/command-catalog.js`

#### Scenario: Client task failure propagates

- **WHEN** a client-executor tool handler's `requestFromClient` call rejects (timeout or client error)
- **THEN** the rejection propagates out of the tool handler without being caught inside the tool

### Requirement: Tool registry and public API

The system SHALL expose a registry at `src/agent/tools/registry.ts` that aggregates client tool factories and provides `buildToolsForConnection(ws: WebSocket): ToolDefinition[]` and `getToolByCommandName(commandName)` backed by static metadata exports. The registry SHALL export a `ClientToolFactory` type alias `(ws: WebSocket) => ToolDefinition` in `types.ts`. The only public import path for other modules SHALL be `src/agent/tools/index.ts`, which re-exports `buildToolsForConnection`, `getToolByCommandName`, `ClientToolFactory`, and shared types. Individual `*.tool.ts` files SHALL NOT be imported from outside the tools folder (except from tests under `tests/agent/tools/`).

#### Scenario: Per-connection structured tools for agent binding

- **WHEN** a consumer calls `buildToolsForConnection(ws)`
- **THEN** it receives a fresh `ToolDefinition[]` with one entry per registered client tool, each bound to the provided WebSocket

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

The change SHALL include Jest unit tests for the registry and each tool file under `tests/agent/tools/`. Tests SHALL verify factory-built handler return shapes (including client `result`), description phrase coverage, `buildToolsForConnection` counts, command-name lookup without WebSocket, duplicate-name assertion against metadata, and error propagation on broker rejection. Jest SHALL discover these files via the standard `tests/` root when running `npm test`.

#### Scenario: Registry returns three tools per connection

- **WHEN** `buildToolsForConnection(mockWs)` is called
- **THEN** it returns exactly three definitions with expected LangChain tool names

#### Scenario: Tool names are valid identifiers

- **WHEN** each tool definition is built via its factory
- **THEN** its LangChain `tool.name` contains no colons and is a valid snake_case identifier

#### Scenario: Tests live under tests/agent/tools

- **WHEN** the agent tools test suite is listed
- **THEN** test files reside under `tests/agent/tools/` and not under `src/agent/tools/`

## REMOVED Requirements

### Requirement: Static getAllTools and getStructuredTools registry helpers

**Reason**: Tools are now constructed per WebSocket connection via `buildToolsForConnection(ws)`; static module-load tool arrays no longer reflect session-bound client delegation.

**Migration**: Replace `getAllTools()` with `buildToolsForConnection(ws)` and replace `getStructuredTools()` with `buildToolsForConnection(ws).map(d => d.tool)`.
