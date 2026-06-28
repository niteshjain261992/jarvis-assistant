# command-catalog Delta Specification

## ADDED Requirements

### Requirement: Canonical command catalog

The system SHALL maintain a version-controlled catalog of supported `ACTION:TARGET` commands. Each entry SHALL define exactly one canonical command string (uppercase `ACTION:TARGET`) and one or more example natural-language phrases that map to that command. The catalog SHALL drive the Ollama system prompt and define `ALLOWED_COMMANDS` for comparison after interpretation.

#### Scenario: Catalog defines camera intent

- **WHEN** the catalog is loaded
- **THEN** it contains an entry with command `OPEN:CAMERA` and phrases including "open camera"

#### Scenario: Catalog membership is not a hard gate

- **WHEN** command interpretation produces a normalized string not in `ALLOWED_COMMANDS`
- **THEN** the service still returns that normalized string (passthrough)

### Requirement: Catalog extensibility

Adding a new supported client action SHALL require adding one catalog entry (command + phrases) and corresponding tests; no prompt string editing outside the catalog module.

#### Scenario: New command added

- **WHEN** a developer adds `{ command: "OFF:CAMERA", phrases: ["close camera", "turn off camera"] }` to the catalog
- **THEN** the generated system prompt includes `OFF:CAMERA` and `ALLOWED_COMMANDS` includes that command
