# error-handling Specification (Delta)

## ADDED Requirements

### Requirement: Custom AppError class

The system SHALL provide an `AppError` class extending `Error` with a numeric `statusCode` and a boolean `isOperational` flag (defaulting to `true`), capturing a clean stack trace at construction.

#### Scenario: Operational error construction

- **WHEN** code constructs `new AppError("Resource not found", 404)`
- **THEN** the instance has `statusCode === 404`, `isOperational === true`, and a stack trace excluding the constructor frame

### Requirement: Unknown routes produce 404 errors

The application SHALL convert requests to unmatched routes into an operational `AppError` with status 404, handled by the global error middleware.

#### Scenario: Unknown route

- **WHEN** a client requests a path with no registered route
- **THEN** the response is HTTP 404 with a structured JSON error body

### Requirement: Centralized global error middleware

The system SHALL register a single 4-arity error-handling middleware as the last middleware in the chain. Operational errors (`isOperational === true`) SHALL produce a JSON response with their `statusCode` and message. Non-operational/unknown errors SHALL be logged in full and produce a generic HTTP 500 response that does not leak internal details. Stack traces SHALL be included in responses only outside production.

#### Scenario: Operational error response

- **WHEN** a handler passes an `AppError` with status 400 to `next()`
- **THEN** the response is HTTP 400 with JSON containing the error message

#### Scenario: Programmer error masked in production

- **WHEN** an unexpected error (e.g., `TypeError`) is thrown in a handler with `NODE_ENV=production`
- **THEN** the full error is logged and the response is HTTP 500 with a generic message and no stack trace
