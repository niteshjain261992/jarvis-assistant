# Design: add-messages-websocket

## Context

Today:
- `createApp()` in `src/app.ts` wires Express routes including `POST /messages`
- `src/server.ts` calls `app.listen(env.PORT)` directly
- `postMessage` validates `{ prompt }` and calls `messageService.createMessage`
- Responses use the unified envelope via `SuccessResponse` / thrown `AppError` → `globalErrorHandler`

The user wants the standard co-hosted pattern: Express on `http.Server`, `WebSocketServer({ server })`, single port. REST and WS must coexist.

Engineering constraints: shared pino logger, zod validation, `createApp()` stays importable without listening, service-structure conventions (orchestrator + handlers), ≥ 90% test coverage.

## Goals / Non-Goals

**Goals:**

- WebSocket clients submit prompts and receive the same semantic outcomes as REST
- One `http.Server`, one port, REST + WS together
- Shared validation + shared `createMessage` pipeline
- Graceful shutdown closes WebSocket server and active connections
- Structured debug/info logs for WS lifecycle

**Non-Goals:**

- Removing or deprecating `POST /messages`
- WebSocket authentication or per-connection conversation binding (v1)
- Bidirectional server-push streaming of partial LLM tokens
- Socket.io or uWebSockets — use `ws` only
- Changing the message pipeline internals

## Decisions

### 1. Server bootstrap split

| Module | Role |
|--------|------|
| `createApp()` | Express only — unchanged contract for supertest |
| `createHttpServer(app)` | `http.createServer(app)` — new export from `src/app.ts` or `src/server/http-server.ts` |
| `attachMessageWebSocket(server)` | Creates `WebSocketServer({ server })`, registers handlers — `src/websocket/messages.gateway.ts` |
| `server.ts` | `connectMongo` → `startAgenda` → `createApp` → `createHttpServer` → `attachMessageWebSocket` → `listen` |

**Alternative considered:** attach WS inside `createApp` — rejected; would break side-effect-free app import and mix transports into test HTTP setup.

### 2. WebSocket message protocol (v1)

**Inbound (client → server):** JSON text frame

```json
{ "prompt": "What is the capital of France?" }
```

Same validation as REST: trimmed, non-empty, max 500 chars.

**Outbound (server → client):** JSON text frame — unified envelope (no HTTP status on wire)

```json
{ "code": "MESSAGE_COMPLETED", "message": "Message completed", "data": { "conversationId": "...", "type": "text", "status": "completed", "content": "..." } }
```

Error cases mirror REST semantics:

| Condition | `code` | Notes |
|-----------|--------|-------|
| Invalid prompt | `BAD_REQUEST` | Send on socket; do not close connection |
| Pipeline failed (image intent) | `MESSAGE_FAILED` | HTTP 200 equivalent |
| LLM `AppError` | `LLM_*` etc. | Map from `AppError.code` |
| Unexpected error | `INTERNAL_SERVER_ERROR` | Log at error; generic message |

Use a small `toEnvelope(result | AppError)` helper so REST and WS share code/message mapping where possible.

**Alternative considered:** typed `{ type: "message.submit", payload }` — deferred; flat `{ prompt }` matches REST body and minimizes client churn.

### 3. Handler structure (`messages.gateway.ts`)

Follow service-structure pattern:

```typescript
export function attachMessageWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    logger.debug('WebSocket client connected');
    ws.on('message', (raw) => void handleRawMessage(ws, raw));
    ws.on('close', () => logger.debug('WebSocket client disconnected'));
    ws.on('error', (err) => logger.error({ err }, 'WebSocket error'));
  });
  return wss;
}
```

`handleRawMessage`:
1. Parse JSON — invalid JSON → `BAD_REQUEST` envelope
2. Validate with shared `messageRequestSchema`
3. Call `createMessage(prompt)`
4. Map result to `MESSAGE_COMPLETED` or `MESSAGE_FAILED`
5. Catch `AppError` and unknown errors → appropriate envelope
6. `ws.send(JSON.stringify(envelope))`

One prompt per message frame; no multiplexing in v1.

### 4. Shared validation

Extract from controller to `src/schemas/message-request.schema.ts`:

```typescript
export const messageRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(500),
});
export type MessageRequest = z.infer<typeof messageRequestSchema>;
```

Controller and gateway both import it.

### 5. Graceful shutdown

On `SIGTERM`/`SIGINT`:

1. `wss.close()` — stop accepting WS connections, close existing
2. `server.close()` — stop HTTP (existing flow)
3. `stopAgenda`, `disconnectMongo`

Store `wss` reference in `server.ts` closure.

### 6. Testing strategy

- **Unit:** `handleRawMessage` / gateway logic with mock `WebSocket` (send spy) and mocked `createMessage`
- **Unit:** invalid JSON, bad prompt, completed, failed, AppError paths
- **HTTP regression:** existing `tests/app.test.ts` and message controller tests unchanged
- **Optional integration:** `ws` client against `createHttpServer(createApp())` in a dedicated test — if stable in Jest

Mock logger in WS tests.

### 7. Documentation

- New `openspec/codebase/interfaces/websocket.md`
- Update `map.md`, `http.md` for bootstrap change

## Risks / Trade-offs

- **[No HTTP status on WS]** → Clients use `code` field; document in interface spec
- **[One connection, sequential prompts]** → v1 sufficient; no queue spec
- **[Malformed frames]** → Respond with envelope; keep connection open for retry
- **[server.ts grows]** → Extract `bootstrapServer()` if needed; keep under ~80 lines per function

## Migration Plan

Additive. Deploy with `ws` dependency. Existing REST clients unaffected. New clients connect to `ws://host:PORT`.

## Open Questions

None for v1.
