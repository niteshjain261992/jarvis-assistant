## ADDED Requirements

### Requirement: Submit prompt over WebSocket

The WebSocket server SHALL accept JSON text frames containing `{ "prompt": string }` with the same validation rules as `POST /messages` (trimmed, non-empty, max 500 characters). Each valid frame SHALL run the synchronous message pipeline via `createMessage` and respond on the same connection with a single JSON text frame.

#### Scenario: Message completed over WebSocket

- **WHEN** a client sends `{ "prompt": "What is the capital of France?" }` and the pipeline succeeds
- **THEN** the server sends a JSON frame with `code: "MESSAGE_COMPLETED"` and `data` containing the completed assistant payload

#### Scenario: Invalid prompt over WebSocket

- **WHEN** a client sends a frame with an invalid or missing `prompt`
- **THEN** the server sends a JSON frame with `code: "BAD_REQUEST"` and an explanatory `message`
- **AND** the WebSocket connection remains open

#### Scenario: Pipeline failed over WebSocket

- **WHEN** the pipeline returns a failed result (e.g. unsupported image intent)
- **THEN** the server sends a JSON frame with `code: "MESSAGE_FAILED"` and `data` including `errorDetails`

#### Scenario: LLM error over WebSocket

- **WHEN** `createMessage` throws an operational LLM error (`LLM_*`)
- **THEN** the server sends a JSON frame with the corresponding error `code` and `message`
- **AND** the WebSocket connection remains open

### Requirement: WebSocket response envelope

WebSocket responses SHALL use the same `{ code, message, data }` envelope shape as HTTP JSON responses. WebSocket clients SHALL determine outcome from the `code` field rather than HTTP status codes.

#### Scenario: Envelope shape on success

- **WHEN** the server responds to a valid prompt frame
- **THEN** the outbound JSON includes `code`, `message`, and `data` keys

#### Scenario: Malformed inbound JSON

- **WHEN** a client sends a frame that is not valid JSON
- **THEN** the server sends a JSON frame with `code: "BAD_REQUEST"` describing the parse failure
