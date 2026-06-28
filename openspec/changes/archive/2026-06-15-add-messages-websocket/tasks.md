# Tasks

Source files in scope (closed-world): `package.json`, `src/server.ts`, `src/app.ts`, `src/schemas/message-request.schema.ts` (new), `src/controllers/message.controller.ts`, `src/websocket/messages.gateway.ts` (new), `src/utils/message-envelope.ts` (new, if needed for shared WS/REST mapping), `tests/websocket/messages.gateway.test.ts` (new), `tests/controllers/message.controller.test.ts`, `openspec/codebase/interfaces/http.md`, `openspec/codebase/interfaces/websocket.md` (new), `openspec/codebase/map.md`.

## 1. Dependencies & shared validation

- [x] 1.1 Add `ws` dependency and `@types/ws` devDependency
- [x] 1.2 Create `src/schemas/message-request.schema.ts` with shared zod schema for `{ prompt }`
- [x] 1.3 Update `src/controllers/message.controller.ts` to import shared schema (behavior unchanged)

## 2. WebSocket gateway

- [x] 2.1 Create `src/utils/message-envelope.ts` — helpers to build success/error envelope objects for WebSocket (and reuse where sensible)
- [x] 2.2 Create `src/websocket/messages.gateway.ts` — `attachMessageWebSocket(server)` with connection lifecycle logging
- [x] 2.3 Implement `handleRawMessage`: parse JSON → validate → `createMessage` → send envelope; handle `AppError` and unexpected errors

## 3. Server bootstrap

- [x] 3.1 Export `createHttpServer(app)` from `src/app.ts` (or dedicated module) returning `http.Server`
- [x] 3.2 Refactor `src/server.ts`: `createHttpServer(createApp())` → `attachMessageWebSocket` → `server.listen`; store `wss` for shutdown
- [x] 3.3 Extend graceful shutdown to close WebSocket server before HTTP `server.close()`

## 4. Documentation

- [x] 4.1 Create `openspec/codebase/interfaces/websocket.md` — protocol, envelope, lifecycle
- [x] 4.2 Update `openspec/codebase/interfaces/http.md` and `openspec/codebase/map.md` for HTTP+WS bootstrap

## 5. Tests

- [x] 5.1 Add `tests/websocket/messages.gateway.test.ts` — valid prompt, invalid prompt, malformed JSON, MESSAGE_FAILED, LLM AppError paths (mocked `createMessage` and logger)
- [x] 5.2 Confirm existing REST/message tests still pass
- [x] 5.3 Run `npm test` — branch coverage remains ≥ 90%
