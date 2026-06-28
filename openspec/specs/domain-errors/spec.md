# domain-errors Specification

## Purpose

Define typed domain errors (`JarvisError`), throw factories, and a centralized handler for broker and tool flows, separate from HTTP `AppError` handling.

## Requirements

### Requirement: Typed domain error model

The system SHALL provide a `src/errors/` module exporting a `JarvisErrorType` enum with values `CLIENT_TIMEOUT`, `CLIENT_ERROR`, and `SERVER_ERROR`, a `JarvisError` class extending `Error` with readonly `type: JarvisErrorType`, `message`, and optional `details: Record<string, unknown>`, and helper `isJarvisError(error: unknown): error is JarvisError`.

#### Scenario: JarvisError carries type and message

- **WHEN** code constructs `new JarvisError(JarvisErrorType.SERVER_ERROR, 'YouTube API key missing')`
- **THEN** the instance has `type === 'SERVER_ERROR'`, the given message, and `name === 'JarvisError'`

#### Scenario: isJarvisError narrows unknown errors

- **WHEN** `isJarvisError` is called with a `JarvisError` instance
- **THEN** it returns `true`
- **WHEN** called with a plain `Error` or non-error value
- **THEN** it returns `false`

### Requirement: Centralized throw factories

The system SHALL provide `throw-error.ts` in `src/errors/` with factory functions `throwClientTimeout`, `throwClientError`, and `throwServerError` that always throw a `JarvisError` with the matching `type` and never return.

#### Scenario: throwClientTimeout throws typed error

- **WHEN** `throwClientTimeout('Client task timed out after 10000ms')` is invoked
- **THEN** it throws a `JarvisError` with `type === 'CLIENT_TIMEOUT'` and the given message

### Requirement: Centralized error handler

The system SHALL provide `handle-error.ts` in `src/errors/` exporting `handleJarvisError(error, context)` as the single dispatcher for typed domain error outcomes. For `context.mode === 'tool'`, when the error is a `JarvisError` with `type === 'CLIENT_TIMEOUT'` and `onClientTimeout` is provided, the handler SHALL return the result of `onClientTimeout(error)` without rethrowing. For `CLIENT_ERROR`, `SERVER_ERROR`, non-`JarvisError` values, or unhandled types, the handler SHALL rethrow.

#### Scenario: Tool mode handles client timeout via callback

- **WHEN** `handleJarvisError` receives a `JarvisError` with `type === 'CLIENT_TIMEOUT'` and context `{ mode: 'tool', onClientTimeout: fn }`
- **THEN** it returns the value produced by `onClientTimeout`
- **AND** does not throw

#### Scenario: Server errors rethrow from handler

- **WHEN** `handleJarvisError` receives a `JarvisError` with `type === 'SERVER_ERROR'`
- **THEN** it rethrows the error

#### Scenario: Unknown errors rethrow from handler

- **WHEN** `handleJarvisError` receives a plain `Error` that is not a `JarvisError`
- **THEN** it rethrows the error
