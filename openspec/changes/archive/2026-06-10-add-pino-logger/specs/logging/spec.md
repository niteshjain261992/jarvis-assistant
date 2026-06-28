# logging Delta Specification

## ADDED Requirements

### Requirement: Shared structured logger

The system SHALL provide a single shared pino logger instance exported from `src/utils/logger.ts`, configured from the validated environment: log level from `env.LOG_LEVEL`, structured JSON output in production, and human-readable pretty output outside production.

#### Scenario: Production output is structured JSON

- **WHEN** the application runs with `NODE_ENV=production` and emits a log entry
- **THEN** the entry is written to stdout as a single JSON object including level, timestamp, and message

#### Scenario: Development output is human-readable

- **WHEN** the application runs with `NODE_ENV=development` and emits a log entry
- **THEN** the entry is rendered in a human-readable pretty format

#### Scenario: Log level filters output

- **WHEN** the process starts with `LOG_LEVEL=error` and code emits an `info`-level entry
- **THEN** the entry is not written to the output

### Requirement: Application code logs through the logger

Application code SHALL emit all runtime logging through the shared logger instead of `console` methods. The only permitted exception is the environment validation failure report in `src/config/env.ts`, which runs before the logger's configuration is available.

#### Scenario: Lifecycle events use the logger

- **WHEN** the server starts, shuts down, or encounters an unhandled rejection or uncaught exception
- **THEN** the corresponding messages are emitted through the shared logger at appropriate levels (`info` for lifecycle, `error`/`fatal` for failures)

#### Scenario: Unexpected request errors use the logger

- **WHEN** the global error handler receives a non-operational error
- **THEN** the full error is logged through the shared logger at `error` level before the generic 500 response is sent
