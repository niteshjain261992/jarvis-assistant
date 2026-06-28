# command-acknowledgment Delta Specification

## ADDED Requirements

### Requirement: Acknowledgment endpoint

The system SHALL expose `POST /acknowledge` accepting a JSON body `{ "prompt": string }` (same validation as `POST /command`: trimmed, non-empty, max 500 characters) and SHALL return HTTP 200 with the unified response envelope `{ "code": "ACKNOWLEDGMENT_SENT", "message": string, "data": { "text": string } }`, where `data.text` is a brief, in-character Jarvis acknowledgment that the request was heard and work is in progress.

#### Scenario: Valid prompt returns acknowledgment text

- **WHEN** a client sends `POST /acknowledge` with body `{ "prompt": "open camera" }` and Ollama is available
- **THEN** the response is HTTP 200 with `code: "ACKNOWLEDGMENT_SENT"` and `data.text` a non-empty string

#### Scenario: Invalid request body

- **WHEN** a client sends `POST /acknowledge` with a missing, empty, or oversized `prompt`
- **THEN** the response is HTTP 400 with the error envelope (`code: "BAD_REQUEST"`, `data: {}`)

### Requirement: Jarvis personality acknowledgment via Ollama

The system SHALL generate acknowledgment text by calling Ollama `/api/generate` from the service layer with a system instruction defining the Jarvis persona (intelligent, witty, slightly sarcastic, deeply loyal; addresses the user as "Sir"; one brief sentence only; contextual to the user's prompt; no `ACTION:TARGET` output), using a 10-second timeout and temperature 0.3.

#### Scenario: Service returns natural language only

- **WHEN** `generateAcknowledgment` is called with a valid prompt
- **THEN** the returned string is trimmed natural-language prose, not a structured command

#### Scenario: Ollama failure surfaces as 502

- **WHEN** Ollama is unreachable, times out, returns non-2xx, or produces empty output during acknowledgment
- **THEN** the client receives HTTP 502 with the appropriate `LLM_*` error code through the global error handler
