## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Client task completion routing

**Reason**: Client-task completions now arrive as `ACTION_ACK` inbound envelopes handled by `action-ack.controller.ts` instead of ad-hoc `client_task_result` / `client_task_error` frames routed inline in the gateway.

**Migration**: Clients MUST send:

```json
{
  "type": "ACTION_ACK",
  "message_id": "<client-generated-id>",
  "timestamp": 1719311005,
  "payload": {
    "original_server_message_id": "<data.requestId from server action frame>",
    "action_executed": "<action name>",
    "status": "SUCCESS",
    "error_details": null
  }
}
```

For failures, set `status: "FAILURE"` and provide `error_details`.

## MODIFIED Requirements

### Requirement: WebSocket pipeline passes connection to agent

`createMessage` SHALL accept the session WebSocket and pass it through to `runAgent` so client-executor tools can delegate to the connected client. The user-prompt controller SHALL invoke `createMessage` with the connection's WebSocket instance.

#### Scenario: Gateway passes WebSocket to createMessage

- **WHEN** a valid `USER_PROMPT` envelope is processed
- **THEN** the user-prompt controller calls `createMessage(payload.text, ws)` with the connection's WebSocket instance
