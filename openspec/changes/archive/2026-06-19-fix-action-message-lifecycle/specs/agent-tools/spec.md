## MODIFIED Requirements

### Requirement: Locally authored LangChain tool definitions

The system SHALL provide LangChain tool definitions under `src/agent/tools/`, one file per supported command. Each tool file SHALL define its own `commandName`, `phrases`, `executor`, and `payload` as local constants exported as `*Metadata` — not loaded from `COMMAND_CATALOG` or `getCommandCatalogEntry`. The LangChain description SHALL be built from the local `phrases` array (phrase-anchored, not generalized). Client-executor tools SHALL be constructed via a factory function `(ws: WebSocket, context?: ClientTaskPersistenceContext) => ToolDefinition` that awaits a real client result through `requestFromClient(ws, commandName, payload, context)` before returning `{ commandName, executor, payload }` where `payload` includes the client `result`. Tool handler errors (timeout or client error) SHALL propagate without being swallowed. When persistence context is provided, it SHALL include `conversationId`, `userMessageId`, and `actionSequenceNumber` for action-row insertion — not the assistant placeholder id.

#### Scenario: Open camera tool awaits client result

- **WHEN** `buildOpenCameraTool(ws, context)` handler is invoked and the client responds successfully
- **THEN** it returns `commandName: 'OPEN:CAMERA'`, `executor: 'client'`, and `payload` containing `{ target: 'camera', result: <clientResult> }`
- **AND** `requestFromClient` was called with the same `context` argument including `userMessageId` and `actionSequenceNumber`

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

The system SHALL expose a registry at `src/agent/tools/registry.ts` that aggregates client tool factories and provides `buildToolsForConnection(ws: WebSocket, context?: ClientTaskPersistenceContext): ToolDefinition[]` and `getToolByCommandName(commandName)` backed by static metadata exports. The registry SHALL export a `ClientToolFactory` type alias `(ws: WebSocket, context?: ClientTaskPersistenceContext) => ToolDefinition` and a `ClientTaskPersistenceContext` type in `types.ts` with fields `conversationId`, `userMessageId`, and `actionSequenceNumber`. The only public import path for other modules SHALL be `src/agent/tools/index.ts`, which re-exports `buildToolsForConnection`, `getToolByCommandName`, `ClientToolFactory`, `ClientTaskPersistenceContext`, and shared types. Individual `*.tool.ts` files SHALL NOT be imported from outside the tools folder (except from tests under `tests/agent/tools/`).

#### Scenario: Per-connection structured tools for agent binding

- **WHEN** a consumer calls `buildToolsForConnection(ws, context)`
- **THEN** it receives a fresh `ToolDefinition[]` with one entry per registered client tool, each bound to the provided WebSocket and persistence context

#### Scenario: Reverse lookup by command name without WebSocket

- **WHEN** `getToolByCommandName('OFF:LIGHTS')` is called
- **THEN** it returns metadata for the tool whose `commandName` is `OFF:LIGHTS` without requiring a WebSocket argument

#### Scenario: Unknown command returns undefined

- **WHEN** `getToolByCommandName('UNKNOWN:NONE')` is called
- **THEN** it returns `undefined`
