# websocket-messages Specification

## Purpose

Define the WebSocket protocol for submitting message prompts and receiving unified envelope responses.

## Requirements

### Requirement: Submit prompt over WebSocket

The WebSocket server SHALL accept inbound JSON text frames conforming to the inbound Message Envelope Pattern with `type: "USER_PROMPT"`. The `payload.text` field SHALL be validated with the same rules previously applied to `prompt` (trimmed, non-empty, max 500 characters). Each valid frame SHALL run the synchronous message pipeline via `createMessage(text, ws)` through the user-prompt controller and respond on the same connection with a single outbound JSON text frame using the existing `{ code, message, data }` shape.

#### Scenario: Message completed over WebSocket

- **WHEN** a client sends a `USER_PROMPT` envelope with `payload.text: "What is the capital of France?"` and the pipeline succeeds
- **THEN** the server sends a JSON frame with `code: "MESSAGE_COMPLETED"` and `data` containing the completed assistant payload

#### Scenario: Invalid prompt over WebSocket

- **WHEN** a client sends a `USER_PROMPT` envelope with an invalid or empty `payload.text`
- **THEN** the server sends a JSON frame with `code: "BAD_REQUEST"` and an explanatory `message`
- **AND** the WebSocket connection remains open

#### Scenario: Pipeline failed over WebSocket

- **WHEN** the pipeline returns a failed result (e.g. unsupported image intent)
- **THEN** the server sends a JSON frame with `code: "MESSAGE_FAILED"` and `data` including `errorDetails`

#### Scenario: LLM error over WebSocket

- **WHEN** `createMessage` throws an operational LLM error (`LLM_*`)
- **THEN** the server sends a JSON frame with the corresponding error `code` and `message`
- **AND** the WebSocket connection remains open

#### Scenario: Legacy flat prompt rejected

- **WHEN** a client sends `{ "prompt": "hello" }` without the envelope shape
- **THEN** the server sends a JSON frame with `code: "BAD_REQUEST"`
- **AND** `createMessage` is not invoked

### Requirement: WebSocket response envelope

WebSocket responses SHALL use the same `{ code, message, data }` envelope shape as HTTP JSON responses. WebSocket clients SHALL determine outcome from the `code` field rather than HTTP status codes.

#### Scenario: Envelope shape on success

- **WHEN** the server responds to a valid prompt frame
- **THEN** the outbound JSON includes `code`, `message`, and `data` keys

#### Scenario: Malformed inbound JSON

- **WHEN** a client sends a frame that is not valid JSON
- **THEN** the server sends a JSON frame with `code: "BAD_REQUEST"` describing the parse failure

### Requirement: WebSocket pipeline passes connection to agent

`createMessage` SHALL accept the session WebSocket and pass it through to `runAgent` so client-executor tools can delegate to the connected client. The user-prompt controller SHALL invoke `createMessage` with the connection's WebSocket instance.

#### Scenario: Gateway passes WebSocket to createMessage

- **WHEN** a valid `USER_PROMPT` envelope is processed
- **THEN** the user-prompt controller calls `createMessage(payload.text, ws)` with the connection's WebSocket instance

### Requirement: Outbound action request envelope

When the server delegates a client-executor action via `requestFromClient`, the outbound WebSocket frame SHALL use the same `{ code, message, data }` envelope shape as chat pipeline responses. The `data` object SHALL use `type: 'action'` and action field names consistent with `CreateMessageResult` (`actionName`, `actionExecutor`, `actionPayload`), plus `requestId` and `status: 'pending'` for in-flight delegation.

#### Scenario: Action delegation matches envelope convention

- **WHEN** a client-executor tool triggers `requestFromClient` during an agent turn
- **THEN** the client receives a frame parseable with the same envelope handler as `MESSAGE_COMPLETED` responses
- **AND** `data.type` is `'action'` (not `'client_task'`)
