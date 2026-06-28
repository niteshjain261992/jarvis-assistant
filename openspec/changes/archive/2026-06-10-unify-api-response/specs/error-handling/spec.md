# error-handling Delta Specification

## MODIFIED Requirements

### Requirement: Custom AppError class

The system SHALL provide an `AppError` class extending `Error` with a numeric `statusCode`, a machine-readable `code` (an `errorCodes` member, defaulting from the status: 400 → `BAD_REQUEST`, 404 → `NOT_FOUND`, 500 → `INTERNAL_SERVER_ERROR`, 502 → `BAD_GATEWAY`, fallback `ERROR`), and a boolean `isOperational` flag (defaulting to `true`), capturing a clean stack trace at construction.

#### Scenario: Operational error construction

- **WHEN** code constructs `new AppError("Resource not found", 404)`
- **THEN** the instance has `statusCode === 404`, `code === "NOT_FOUND"`, `isOperational === true`, and a stack trace excluding the constructor frame

#### Scenario: Explicit error code

- **WHEN** code constructs an `AppError` with an explicit `code` (e.g. via an `ErrorResponse` catalog entry)
- **THEN** the instance carries that code instead of the status-derived default

### Requirement: Centralized global error middleware

The system SHALL register a single 4-arity error-handling middleware as the last middleware in the chain. Operational errors (`isOperational === true`) SHALL produce the unified error envelope `{ "code": string, "message": string, "data": {} }` with their `statusCode`, where `code` is the error's `code` field. Non-operational/unknown errors SHALL be logged in full and produce a generic HTTP 500 envelope (`code: "INTERNAL_SERVER_ERROR"`, `message: "Internal server error"`) that does not leak internal details. Stack traces SHALL be included in responses only outside production.

#### Scenario: Operational error response

- **WHEN** a handler passes an `AppError` with status 400 to `next()`
- **THEN** the response is HTTP 400 with JSON containing `code: "BAD_REQUEST"`, the error message, and `data: {}`

#### Scenario: Programmer error masked in production

- **WHEN** an unexpected error (e.g., `TypeError`) is thrown in a handler with `NODE_ENV=production`
- **THEN** the full error is logged and the response is HTTP 500 with `code: "INTERNAL_SERVER_ERROR"`, a generic message, `data: {}`, and no stack trace
