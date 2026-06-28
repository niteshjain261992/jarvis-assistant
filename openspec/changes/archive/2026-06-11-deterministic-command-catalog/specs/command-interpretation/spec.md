# command-interpretation Delta Specification

## MODIFIED Requirements

### Requirement: Ollama integration via service layer

The system SHALL call the Ollama HTTP API (`POST {OLLAMA_BASE_URL}/api/generate`, non-streaming, temperature 0) from a dedicated service (`src/services/ollama.service.ts`) that contains no Express types. The system instruction SHALL be built from the **command catalog**, listing every allowed `ACTION:TARGET` with phrase hints and instructing the model to output only a catalog command (never synonyms or invented targets). The service SHALL normalize model output (trim, strip quotes, uppercase). When the normalized result is not in `ALLOWED_COMMANDS`, the service SHALL return that normalized string unchanged (passthrough).

#### Scenario: Output normalization

- **WHEN** the model responds with surrounding whitespace, quotes, or lowercase text (e.g., `"open:camera"`)
- **THEN** the service returns the normalized command string (e.g. `OPEN:CAMERA` if that is the model output)

#### Scenario: Jarvis agent system instruction

- **WHEN** `interpretCommand` calls the Ollama generate endpoint
- **THEN** the request `system` field describes a Jarvis agent command interpreter and enumerates the full command catalog

#### Scenario: Consistent camera command via catalog prompt

- **WHEN** the model is asked to interpret "open camera" and responds with `OPEN:CAMERA`
- **THEN** the service returns `OPEN:CAMERA`

#### Scenario: Non-catalog model output passthrough

- **WHEN** the model responds with `OPEN:VIDEO_CAMERA` (not in the catalog)
- **THEN** the service returns `OPEN:VIDEO_CAMERA` without throwing an error
