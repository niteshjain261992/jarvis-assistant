# command-interpretation Specification (Delta)

## ADDED Requirements

### Requirement: Command interpretation endpoint

The system SHALL expose `POST /command` accepting a JSON body `{ "prompt": string }` and SHALL return HTTP 200 with `{ "command": string, "model": string }`, where `command` is the structured `ACTION:TARGET` interpretation of the prompt produced by the configured Ollama model.

#### Scenario: Open camera intent

- **WHEN** a client sends `POST /command` with body `{ "prompt": "open camera" }` and Ollama is available
- **THEN** the response is HTTP 200 with JSON containing `command: "OPEN:CAMERA"`

#### Scenario: Invalid request body

- **WHEN** a client sends `POST /command` with a missing, empty, or non-string `prompt`
- **THEN** the response is HTTP 400 with a structured error body describing the validation failure

### Requirement: Ollama integration via service layer

The system SHALL call the Ollama HTTP API (`POST {OLLAMA_BASE_URL}/api/generate`, non-streaming, temperature 0) from a dedicated service (`src/services/ollama.service.ts`) that contains no Express types, constrains the model with a system instruction to output only `ACTION:TARGET` commands, and normalizes the model output (trim, strip quotes, uppercase).

#### Scenario: Output normalization

- **WHEN** the model responds with surrounding whitespace, quotes, or lowercase text (e.g., `"open:camera"`)
- **THEN** the service returns the normalized command `OPEN:CAMERA`

### Requirement: Ollama failure handling

The system SHALL treat Ollama unreachability, request timeout (30s), non-2xx responses, and empty model output as operational failures, surfacing HTTP 502 through the global error handler without leaking internal details beyond the operational message.

#### Scenario: Ollama unreachable

- **WHEN** a client sends a valid `POST /command` and the Ollama endpoint cannot be reached
- **THEN** the response is HTTP 502 with a structured error body indicating the language model service is unavailable
