# logging Specification

## Purpose

Provide a single shared structured logger for the application so runtime output is consistent, level-filtered, and machine-parseable in production while staying readable in development.

## Requirements

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

### Requirement: Debug-level pipeline observability

When `LOG_LEVEL` is `debug`, the message pipeline and conversation-summary worker SHALL emit structured debug entries using the shared pino logger. Pipeline logs SHALL use consistent field names (`conversationId`, `intent`, `llmOperation`, `durationMs`, `actionName`, `summaryJob`) and SHALL avoid logging full user prompts or model response bodies.

#### Scenario: Debug logs visible in development

- **WHEN** the application runs with `LOG_LEVEL=debug` and a `POST /messages` request is processed
- **THEN** pipeline checkpoint logs appear in the output

#### Scenario: Pipeline logs suppressed at info level

- **WHEN** the application runs with `LOG_LEVEL=info` (default)
- **THEN** pipeline checkpoint debug entries are not written while error and warn entries still are

### Requirement: Error-level pipeline failure observability

At default `LOG_LEVEL=info`, the message pipeline SHALL emit structured `error` and `warn` entries for failure paths defined in `message-pipeline-logging`, using the shared pino logger. Error logs SHALL use the `{ err }` field for thrown errors. Pipeline failure logs SHALL use consistent field names (`conversationId`, `userMessageId`, `assistantMessageId`, `pipelineStage`, `intent`, `errorDetails`) and SHALL avoid logging full user prompts or model response bodies.

#### Scenario: Pipeline errors visible at info level

- **WHEN** the application runs with `LOG_LEVEL=info` and `createMessage` throws after persisting messages
- **THEN** an error-level pipeline failure log is written

#### Scenario: Expected failures visible at info level

- **WHEN** the application runs with `LOG_LEVEL=info` and `createMessage` returns a failed result for unsupported image intent
- **THEN** a warn-level pipeline failure log is written

#### Scenario: Debug pipeline logs unchanged

- **WHEN** the application runs with `LOG_LEVEL=debug` and a successful `POST /messages` request is processed
- **THEN** existing debug checkpoint logs still appear alongside any error or warn entries on failure paths
