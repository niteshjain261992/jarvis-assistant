## MODIFIED Requirements

### Requirement: Custom AppError class

The system SHALL provide an `AppError` class extending `Error` with a numeric `statusCode`, a machine-readable `code` (an `errorCodes` member, defaulting from the status: 400 → `BAD_REQUEST`, 404 → `NOT_FOUND`, 500 → `INTERNAL_SERVER_ERROR`, 502 → `BAD_GATEWAY`, fallback `ERROR`), and a boolean `isOperational` flag (defaulting to `true`), capturing a clean stack trace at construction. Domain errors in `src/errors/` (`JarvisError`) SHALL remain separate from `AppError` and SHALL be used for broker/tool flows; HTTP middleware SHALL continue to handle `AppError` only unless explicitly mapped at a service boundary.

#### Scenario: Operational error construction

- **WHEN** code constructs `new AppError("Resource not found", 404)`
- **THEN** the instance has `statusCode === 404`, `code === "NOT_FOUND"`, `isOperational === true`, and a stack trace excluding the constructor frame

#### Scenario: Explicit error code

- **WHEN** code constructs an `AppError` with an explicit `code` (e.g. via an `ErrorResponse` catalog entry)
- **THEN** the instance carries that code instead of the status-derived default
