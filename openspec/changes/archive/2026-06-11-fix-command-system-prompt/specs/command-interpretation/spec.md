# command-interpretation Delta Specification

## MODIFIED Requirements

### Requirement: Ollama integration via service layer

The system SHALL call the Ollama HTTP API (`POST {OLLAMA_BASE_URL}/api/generate`, non-streaming, temperature 0) from a dedicated service (`src/services/ollama.service.ts`) that contains no Express types, constrains the model with a system instruction identifying it as the **Jarvis personal agent** command interpreter and requiring output of only `ACTION:TARGET` commands, and normalizes the model output (trim, strip quotes, uppercase).

#### Scenario: Output normalization

- **WHEN** the model responds with surrounding whitespace, quotes, or lowercase text (e.g., `"open:camera"`)
- **THEN** the service returns the normalized command `OPEN:CAMERA`

#### Scenario: Jarvis agent system instruction

- **WHEN** `interpretCommand` calls the Ollama generate endpoint
- **THEN** the request `system` field describes a Jarvis agent command interpreter (not a generic home assistant) and still requires a single `ACTION:TARGET` command with no extra text
