# http-server Specification (Delta)

## ADDED Requirements

### Requirement: Express application with security defaults

The system SHALL expose an Express application configured with `helmet` security headers, `cors`, and JSON body parsing, constructed in `src/app.ts` without side effects (no listening, no process handlers) so it can be imported by tests.

#### Scenario: Security headers applied

- **WHEN** any HTTP request is handled by the application
- **THEN** the response includes helmet's default security headers (e.g., `x-content-type-options: nosniff`)

#### Scenario: JSON bodies parsed

- **WHEN** a request is sent with `Content-Type: application/json` and a valid JSON body
- **THEN** handlers receive the parsed body as `req.body`

### Requirement: Health-check endpoint

The application SHALL expose `GET /health` returning HTTP 200 with a JSON payload indicating service status and uptime.

#### Scenario: Health check succeeds

- **WHEN** a client sends `GET /health`
- **THEN** the response is HTTP 200 with JSON containing `status: "ok"`

### Requirement: Server entry point with graceful shutdown

The server entry point (`src/server.ts`) SHALL start the HTTP listener on the configured port and SHALL handle process lifecycle events: `SIGTERM` and `SIGINT` trigger a graceful close (stop accepting connections, then exit 0); `unhandledRejection` is logged and escalated; `uncaughtException` is logged and the process exits with code 1.

#### Scenario: Graceful shutdown on SIGTERM

- **WHEN** the process receives `SIGTERM` while the server is running
- **THEN** the server stops accepting new connections, closes cleanly, and the process exits with code 0

#### Scenario: Uncaught exception

- **WHEN** an uncaught exception is thrown anywhere in the process
- **THEN** the error is logged and the process exits with code 1

#### Scenario: Unhandled promise rejection

- **WHEN** a promise rejection is never handled
- **THEN** the rejection reason is logged and the process terminates via the uncaught-exception path
