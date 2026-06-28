## MODIFIED Requirements

### Requirement: Server entry point with graceful shutdown

The server entry point (`src/server.ts`) SHALL start an `http.Server` (wrapping the Express app) on the configured port with an attached WebSocket server, and SHALL handle process lifecycle events: `SIGTERM` and `SIGINT` trigger a graceful close (close WebSocket server, stop accepting HTTP connections, then exit 0); `unhandledRejection` is logged and escalated; `uncaughtException` is logged and the process exits with code 1.

#### Scenario: Graceful shutdown on SIGTERM

- **WHEN** the process receives `SIGTERM` while the server is running
- **THEN** the WebSocket server and HTTP server stop accepting new connections, close cleanly, and the process exits with code 0

#### Scenario: Uncaught exception

- **WHEN** an uncaught exception is thrown anywhere in the process
- **THEN** the error is logged and the process exits with code 1

#### Scenario: Unhandled promise rejection

- **WHEN** a promise rejection is never handled
- **THEN** the rejection reason is logged and the process terminates via the uncaught-exception path
