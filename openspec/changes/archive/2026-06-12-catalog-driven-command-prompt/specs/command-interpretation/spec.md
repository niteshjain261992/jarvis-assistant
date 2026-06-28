## MODIFIED Requirements

### Requirement: Ollama integration via service layer

The system SHALL call the Ollama HTTP API (`POST {OLLAMA_BASE_URL}/api/generate`, non-streaming, temperature 0) from a dedicated service (`src/services/ollama.service.ts`) that contains no Express types. The system instruction SHALL be built by `buildCommandSystemPrompt()` from `COMMAND_CATALOG`, dynamically listing every allowed `ACTION:TARGET` with trigger phrases from each entry's `phrases` array, plus static parser rules and `UNKNOWN:NONE` fallback instructions. The service SHALL normalize model output (trim, strip quotes, uppercase). When the normalized result is not in `ALLOWED_COMMANDS`, the service SHALL return that normalized string unchanged (passthrough).

#### Scenario: Output normalization

- **WHEN** the model responds with surrounding whitespace, quotes, or lowercase text (e.g., `"open:camera"`)
- **THEN** the service returns the normalized command string (e.g. `OPEN:CAMERA` if that is the model output)

#### Scenario: Catalog-driven system instruction

- **WHEN** `interpretCommand` calls the Ollama generate endpoint
- **THEN** the request `system` field includes every `COMMAND_CATALOG` command and its trigger phrases, generated from catalog data rather than hardcoded strings

#### Scenario: Prompt updates when catalog changes

- **WHEN** a new command is added to `COMMAND_CATALOG`
- **THEN** `buildCommandSystemPrompt()` includes that command and its phrases without editing separate hardcoded prompt lines

#### Scenario: Consistent camera command via catalog prompt

- **WHEN** the model is asked to interpret "open camera" and responds with `OPEN:CAMERA`
- **THEN** the service returns `OPEN:CAMERA`

#### Scenario: Unknown request maps to UNKNOWN:NONE

- **WHEN** the model is asked to interpret a non-command request (e.g. "tell me my name") and responds with `UNKNOWN:NONE`
- **THEN** the service returns `UNKNOWN:NONE`

#### Scenario: Non-catalog model output passthrough

- **WHEN** the model responds with `OPEN:VIDEO_CAMERA` (not in the catalog)
- **THEN** the service returns `OPEN:VIDEO_CAMERA` without throwing an error
