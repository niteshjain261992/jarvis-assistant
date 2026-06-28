# Proposal: add-messages-websocket

## Why

Clients currently submit prompts only via `POST /messages`, which requires a new HTTP request per turn and is a poor fit for persistent, low-latency chat UIs. Adding WebSocket on the **same port** as the existing Express app lets mobile/desktop clients keep a live connection while **REST remains available** for simple integrations, health checks, and backward compatibility.

## What Changes

- Add the `ws` library and attach a `WebSocketServer` to the shared `http.Server` that wraps Express (single listen on `env.PORT`)
- Introduce a WebSocket message handler for submitting prompts: client sends JSON `{ "prompt": string }`, server replies with the same `{ code, message, data }` envelope used by REST (`MESSAGE_COMPLETED`, `MESSAGE_FAILED`, or error codes)
- Reuse `messageService.createMessage` for both REST and WebSocket — no duplicate pipeline logic
- Extract shared prompt validation (zod schema) used by REST controller and WebSocket handler
- Refactor `src/server.ts` to bootstrap `createServer(app)` + `WebSocketServer` + graceful shutdown (close WS clients, then HTTP server)
- Keep `createApp()` side-effect-free for existing supertest HTTP tests
- Add structured logging for WebSocket connect/disconnect/errors (no `console.*`)
- **REST `POST /messages` is unchanged** — not removed or deprecated in v1

## Capabilities

### New Capabilities

- `websocket-server`: Shared HTTP + WebSocket server bootstrap, connection lifecycle, and graceful shutdown on the configured port
- `websocket-messages`: WebSocket protocol for submitting prompts and receiving envelope responses aligned with REST message semantics

### Modified Capabilities

- `http-server`: Entry point SHALL use `http.createServer(app)` with WebSocket attached; graceful shutdown SHALL close WebSocket connections before HTTP close
- `async-messages`: Message submission SHALL be available via WebSocket in addition to `POST /messages`, with equivalent validation and pipeline behavior

## Impact

- **Dependencies**: `ws`, `@types/ws` (dev)
- **Code**: `src/server.ts`, new `src/websocket/` module, shared message request schema, `src/controllers/message.controller.ts` (use shared schema), `openspec/codebase/interfaces/http.md`, `openspec/codebase/map.md`
- **HTTP**: No breaking change to `POST /messages` or `/health`
- **Clients**: New `ws://host:PORT` endpoint for message exchange
- **Tests**: WebSocket handler unit tests + server bootstrap tests; coverage ≥ 90%
