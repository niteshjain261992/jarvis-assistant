# Interface: websocket (`src/websocket/messages.gateway.ts`)

## src/websocket/messages.gateway.ts

```ts
export function attachMessageWebSocket(server: HttpServer): WebSocketServer;
export function handleRawMessage(ws: WebSocket, raw: RawData): Promise<void>;
```

- `attachMessageWebSocket`: creates `WebSocketServer({ server })` on the shared `http.Server` used by Express. Logs connect/disconnect at debug, errors at error.
- `handleRawMessage`: parses inbound JSON frame; routes client-task completion frames to broker; otherwise validates `{ prompt }`, runs `createMessage(prompt, ws)`, sends outbound envelope.

## Connection

- URL: `ws://host:PORT` (same port as HTTP; no separate path in v1)
- Transport: `ws` library (`WebSocketServer` attached to `http.Server`)

## Inbound chat frame

JSON text frame:

```json
{ "prompt": "What is the capital of France?" }
```

Validation: trimmed, non-empty, max 500 characters.

## Inbound client-task frames

Routed before chat validation (not treated as user turns):

```json
{ "type": "client_task_result", "requestId": "<id>", "result": <value> }
{ "type": "client_task_error", "requestId": "<id>", "error": "<message>" }
```

- `client_task_result` → `resolveClientTask(requestId, result)`
- `client_task_error` → `rejectClientTask(requestId, error)`

See `interfaces/client-task-broker.md` for correlation and persistence.

## Outbound chat frame

JSON text frame — unified envelope (no HTTP status on wire):

```json
{
  "code": "MESSAGE_COMPLETED",
  "message": "Message completed",
  "data": { "conversationId": "...", "type": "text", "status": "completed", "content": "..." }
}
```

| Outcome | `code` |
|---------|--------|
| Pipeline success | `MESSAGE_COMPLETED` |
| Pipeline failed result | `MESSAGE_FAILED` |
| Client-action delegation (in-flight) | `ACTION_REQUEST` |
| Invalid JSON or prompt | `BAD_REQUEST` |
| Operational LLM error | `LLM_*` (from `AppError.code`) |
| Unexpected server error | `INTERNAL_SERVER_ERROR` |

Connection stays open after error envelopes (client may retry).

## Outbound action delegation frame

Sent by `requestFromClient` during an agent turn (not by `handleRawMessage` directly):

```json
{
  "code": "ACTION_REQUEST",
  "message": "Action requested",
  "data": {
    "type": "action",
    "status": "pending",
    "requestId": "...",
    "actionName": "OPEN:CAMERA",
    "actionExecutor": "client",
    "actionPayload": { "target": "camera" }
  }
}
```

Built by `actionRequestEnvelope` in `interfaces/message-envelope.md`.

## Shared pipeline

WebSocket calls `messageService.createMessage(prompt, ws)`. Prompt validation uses `src/schemas/message-request.schema.ts`. Envelope builders live in `src/utils/message-envelope.ts`.

## Bootstrap

See `interfaces/http.md` — `src/server.ts` calls `createHttpServer(createApp())` then `attachMessageWebSocket(server)`. Graceful shutdown closes WebSocket server before HTTP `server.close()`.
