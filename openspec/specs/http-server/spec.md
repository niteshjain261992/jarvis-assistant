# http-server Specification

## Purpose

Define the Express HTTP server: a side-effect-free application with security defaults, a health-check endpoint, and an entry point that manages the process lifecycle with graceful shutdown.

## Requirements

### Requirement: Express application with security defaults

The system SHALL expose an Express application configured with `helmet` security headers, `cors`, and JSON body parsing, constructed in `src/app.ts` without side effects (no listening, no process handlers) so it can be imported by tests.

#### Scenario: Security headers applied

- **WHEN** any HTTP request is handled by the application
- **THEN** the response includes helmet's default security headers (e.g., `x-content-type-options: nosniff`)

#### Scenario: JSON bodies parsed

- **WHEN** a request is sent with `Content-Type: application/json` and a valid JSON body
- **THEN** handlers receive the parsed body as `req.body`

### Requirement: Health-check endpoint

The application SHALL expose `GET /health` returning HTTP 200 with the unified response envelope, where `data` contains the service status and uptime: `{ "code": "HEALTH_OK", "message": string, "data": { "status": "ok", "uptime": number, "timestamp": string } }`.

#### Scenario: Health check succeeds

- **WHEN** a client sends `GET /health`
- **THEN** the response is HTTP 200 with JSON containing `data.status: "ok"` and `code: "HEALTH_OK"`

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
