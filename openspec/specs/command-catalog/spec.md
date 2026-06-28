# command-catalog Specification

## Purpose

Define the canonical catalog of supported `ACTION:TARGET` commands and phrase hints used for executor/payload metadata lookup. Tool selection is performed by LangChain agent tools in `src/agent/tools/`.

## Requirements

### Requirement: Canonical command catalog

The system SHALL maintain a version-controlled catalog of supported `ACTION:TARGET` commands. Each entry SHALL define exactly one canonical command string (uppercase `ACTION:TARGET`) and one or more example natural-language phrases. The catalog SHALL define `ALLOWED_COMMANDS` and `getCommandCatalogEntry()` for executor and payload metadata lookup. The catalog SHALL NOT drive an Ollama command-interpreter system prompt — tool selection is performed by LangChain agent tools in `src/agent/tools/`. The `PLAY:MUSIC` entry base payload SHALL use `{ action: 'music' }` (not `{ action: 'play_music' }`).

#### Scenario: Catalog defines camera intent

- **WHEN** the catalog is loaded
- **THEN** it contains an entry with command `OPEN:CAMERA` and phrases including "open camera"

#### Scenario: Catalog defines music intent with updated action

- **WHEN** `getCommandCatalogEntry('PLAY:MUSIC')` is called
- **THEN** it returns an entry whose base `payload` is `{ action: 'music' }`

#### Scenario: Catalog membership is not a hard gate

- **WHEN** a command string is not in `ALLOWED_COMMANDS`
- **THEN** `getCommandCatalogEntry` returns `undefined` and callers handle the missing entry appropriately

### Requirement: Catalog extensibility

Adding a new supported client action for the agent pipeline SHALL require adding a LangChain tool definition under `src/agent/tools/` per the `agent-tools` capability. Catalog entries MAY be updated in parallel for metadata consistency but SHALL NOT be required for prompt generation.

#### Scenario: New command added to agent tools

- **WHEN** a developer adds a new tool with `commandName: "OFF:CAMERA"` and phrase-anchored description
- **THEN** the agent can select that tool for matching prompts without a separate command-interpreter prompt
