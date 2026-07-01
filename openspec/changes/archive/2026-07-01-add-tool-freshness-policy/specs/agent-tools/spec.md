## ADDED Requirements

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

## MODIFIED Requirements

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
