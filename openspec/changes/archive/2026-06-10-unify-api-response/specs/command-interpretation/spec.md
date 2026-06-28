# command-interpretation Delta Specification

## MODIFIED Requirements

### Requirement: Command interpretation endpoint

The system SHALL expose `POST /command` accepting a JSON body `{ "prompt": string }` and SHALL return HTTP 200 with the unified response envelope `{ "code": "COMMAND_INTERPRETED", "message": string, "data": { "command": string, "model": string } }`, where `data.command` is the structured `ACTION:TARGET` interpretation of the prompt produced by the configured Ollama model.

#### Scenario: Open camera intent

- **WHEN** a client sends `POST /command` with body `{ "prompt": "open camera" }` and Ollama is available
- **THEN** the response is HTTP 200 with JSON containing `data.command: "OPEN:CAMERA"` and `code: "COMMAND_INTERPRETED"`

#### Scenario: Invalid request body

- **WHEN** a client sends `POST /command` with a missing, empty, or non-string `prompt`
- **THEN** the response is HTTP 400 with the error envelope (`code: "BAD_REQUEST"`, `data: {}`) describing the validation failure

### Requirement: Ollama failure handling

The system SHALL treat Ollama unreachability, request timeout (30s), non-2xx responses, and empty model output as operational failures, surfacing HTTP 502 through the global error handler with the error envelope and a distinct error code per failure mode (`LLM_UNAVAILABLE`, `LLM_ERROR_RESPONSE`, `LLM_EMPTY_RESPONSE`) without leaking internal details beyond the operational message.

#### Scenario: Ollama unreachable

- **WHEN** a client sends a valid `POST /command` and the Ollama endpoint cannot be reached
- **THEN** the response is HTTP 502 with `code: "LLM_UNAVAILABLE"`, `data: {}`, and a message indicating the language model service is unavailable
