## ADDED Requirements

### Requirement: Locally authored LangChain tool definitions

The system SHALL provide LangChain tool definitions under `src/agent/tools/`, one file per supported command. Each tool file SHALL define its own `commandName`, `phrases`, `executor`, and `payload` as local constants — not loaded from `COMMAND_CATALOG` or `getCommandCatalogEntry`. The LangChain description SHALL be built from the local `phrases` array (phrase-anchored, not generalized). Each tool's handler SHALL return `{ commandName, executor, payload }` from those local constants and SHALL NOT execute client or server side effects.

#### Scenario: Open camera tool uses local metadata

- **WHEN** the open camera tool handler is invoked
- **THEN** it returns `commandName: 'OPEN:CAMERA'`, `executor: 'client'`, and `payload: { target: 'camera' }` as defined in `open-camera.tool.ts`

#### Scenario: Tool description includes local phrases

- **WHEN** the open camera tool definition is loaded
- **THEN** its LangChain description includes every phrase defined locally in that file (e.g. "open camera", "take a photo")

#### Scenario: Tool files do not import catalog

- **WHEN** any `*.tool.ts` file under `src/agent/tools/` is inspected
- **THEN** it does not import from `@/config/command-catalog.js`

### Requirement: Tool registry and public API

The system SHALL expose a registry at `src/agent/tools/registry.ts` that aggregates all tool definitions and provides `getAllTools()`, `getStructuredTools()`, and `getToolByCommandName(commandName)`. The only public import path for other modules SHALL be `src/agent/tools/index.ts`, which re-exports registry helpers and shared types. Individual `*.tool.ts` files SHALL NOT be imported from outside the tools folder (except from tests under `tests/agent/tools/`).

#### Scenario: Structured tools for agent binding

- **WHEN** a consumer calls `getStructuredTools()`
- **THEN** it receives a LangChain `StructuredTool[]` with one entry per registered tool, same count as `getAllTools()`

#### Scenario: Reverse lookup by command name

- **WHEN** `getToolByCommandName('OFF:LIGHTS')` is called
- **THEN** it returns the tool definition whose `commandName` is `OFF:LIGHTS`

#### Scenario: Unknown command returns undefined

- **WHEN** `getToolByCommandName('UNKNOWN:NONE')` is called
- **THEN** it returns `undefined`

### Requirement: Uniqueness enforcement

The registry SHALL throw at module load if any two tool definitions share the same LangChain `tool.name` or the same `commandName`.

#### Scenario: Duplicate tool name fails fast

- **WHEN** the registry is initialized with two definitions whose LangChain tool names are identical
- **THEN** module load throws an error describing the duplicate name

#### Scenario: Duplicate command name fails fast

- **WHEN** the registry is initialized with two definitions whose `commandName` values are identical
- **THEN** module load throws an error describing the duplicate command name

### Requirement: Agent tools unit tests under tests/

The change SHALL include Jest unit tests for the registry and each tool file under `tests/agent/tools/`. Tests SHALL verify handler return shapes, description phrase coverage, registry counts, structured-tool unwrapping, command-name lookup, and duplicate-name assertion behavior. Jest SHALL discover these files via the standard `tests/` root when running `npm test` — not via a separate `src/agent/tools` root.

#### Scenario: Registry returns three tools

- **WHEN** `getAllTools()` is called
- **THEN** it returns exactly three definitions

#### Scenario: Tool names are valid identifiers

- **WHEN** each tool definition is inspected
- **THEN** its LangChain `tool.name` contains no colons and is a valid snake_case identifier

#### Scenario: Tests live under tests/agent/tools

- **WHEN** the agent tools test suite is listed
- **THEN** test files reside under `tests/agent/tools/` and not under `src/agent/tools/`
