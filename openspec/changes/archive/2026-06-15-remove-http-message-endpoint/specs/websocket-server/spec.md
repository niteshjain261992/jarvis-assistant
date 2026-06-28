## MODIFIED Requirements

### Requirement: Shared HTTP and WebSocket listener

The server entry point SHALL create an `http.Server` from the Express application and attach a `WebSocketServer` from the `ws` package to that same server. HTTP routes (including `GET /health`) and WebSocket connections SHALL share the configured port (`env.PORT`). Message submission is WebSocket-only; there is no `POST /messages` route.

#### Scenario: Single port for HTTP and WebSocket

- **WHEN** the server starts successfully
- **THEN** clients MAY connect via HTTP to `/health` and via WebSocket to `ws://host:PORT` on the same port

#### Scenario: Express app remains side-effect free

- **WHEN** tests import `createApp()` from `src/app.ts`
- **THEN** no HTTP listener or WebSocket server is started
