## MODIFIED Requirements

### Requirement: Ollama integration via service layer

The system SHALL call the Ollama HTTP API (`POST {OLLAMA_BASE_URL}/api/generate`, non-streaming, temperature 0) from a dedicated service (`src/services/ollama.service.ts`) that contains no Express types. The system instruction SHALL be built from `buildCommandSystemPrompt()` in `src/config/command-catalog.ts`, using a structured command-parser prompt that lists allowed `ACTION:TARGET` commands with trigger phrases, parsing rules (uppercase output, no invented commands, ignore politeness words), few-shot examples, and `UNKNOWN:NONE` for requests that do not clearly match a catalog command. The service SHALL normalize model output (trim, strip quotes, uppercase). When the normalized result is not in `ALLOWED_COMMANDS`, the service SHALL return that normalized string unchanged (passthrough).

#### Scenario: Output normalization

- **WHEN** the model responds with surrounding whitespace, quotes, or lowercase text (e.g., `"open:camera"`)
- **THEN** the service returns the normalized command string (e.g. `OPEN:CAMERA` if that is the model output)

#### Scenario: Structured command parser system instruction

- **WHEN** `interpretCommand` calls the Ollama generate endpoint
- **THEN** the request `system` field describes a Jarvis command parser with rules, per-command triggers, examples, and `UNKNOWN:NONE` fallback

#### Scenario: Consistent camera command via catalog prompt

- **WHEN** the model is asked to interpret "open camera" and responds with `OPEN:CAMERA`
- **THEN** the service returns `OPEN:CAMERA`

#### Scenario: Unknown request maps to UNKNOWN:NONE

- **WHEN** the model is asked to interpret a non-command request (e.g. "tell me my name") and responds with `UNKNOWN:NONE`
- **THEN** the service returns `UNKNOWN:NONE`

#### Scenario: Non-catalog model output passthrough

- **WHEN** the model responds with `OPEN:VIDEO_CAMERA` (not in the catalog)
- **THEN** the service returns `OPEN:VIDEO_CAMERA` without throwing an error
