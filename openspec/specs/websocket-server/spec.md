# websocket-server Specification

## Purpose

Define shared HTTP and WebSocket server bootstrap on a single port, connection lifecycle logging, and graceful WebSocket shutdown.

## Requirements

### Requirement: Shared HTTP and WebSocket listener

The server entry point SHALL create an `http.Server` from the Express application and attach a `WebSocketServer` from the `ws` package to that same server. HTTP routes (including `GET /health`) and WebSocket connections SHALL share the configured port (`env.PORT`). Message submission is WebSocket-only; there is no `POST /messages` route.

#### Scenario: Single port for HTTP and WebSocket

- **WHEN** the server starts successfully
- **THEN** clients MAY connect via HTTP to `/health` and via WebSocket to `ws://host:PORT` on the same port

#### Scenario: Express app remains side-effect free

- **WHEN** tests import `createApp()` from `src/app.ts`
- **THEN** no HTTP listener or WebSocket server is started

### Requirement: WebSocket connection lifecycle logging

The WebSocket server SHALL log connection open, close, and error events through the shared pino logger at appropriate levels. It SHALL NOT use `console` methods.

#### Scenario: Client connects

- **WHEN** a WebSocket client successfully connects
- **THEN** a debug log is emitted indicating a client connected

#### Scenario: Client disconnects

- **WHEN** a WebSocket connection closes
- **THEN** a debug log is emitted indicating a client disconnected

#### Scenario: WebSocket error

- **WHEN** a WebSocket connection emits an error
- **THEN** an error log is emitted with `{ err }`

### Requirement: Graceful WebSocket shutdown

During graceful shutdown (`SIGTERM`/`SIGINT`), the process SHALL close the WebSocket server and active connections before or as part of closing the HTTP server.

#### Scenario: Shutdown closes WebSocket server

- **WHEN** the process receives `SIGTERM` or `SIGINT`
- **THEN** the WebSocket server is closed as part of graceful shutdown before the process exits
