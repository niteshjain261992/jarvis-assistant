# api-response Delta Specification

## ADDED Requirements

### Requirement: Unified response envelope

Every JSON response from the API, success or error, SHALL use the envelope `{ "code": string, "message": string, "data": object }`, where `code` is a machine-readable member of a central success/error code enum, `message` is a human-readable summary, and `data` carries the payload (defaulting to `{}` when there is none, including on errors).

#### Scenario: Success envelope

- **WHEN** any endpoint responds successfully
- **THEN** the body is `{ code, message, data }` with the payload inside `data` and `code` a member of `successCodes`

#### Scenario: Error envelope

- **WHEN** any request fails (validation, unknown route, upstream failure, or unexpected error)
- **THEN** the body is `{ code, message, data: {} }` where `code` is a member of `errorCodes` (e.g. 400 → `BAD_REQUEST`)

### Requirement: Typed response catalogs

The system SHALL provide in `src/utils/api-response.ts`: `successCodes` and `errorCodes` string enums, a `successResponse(res, httpStatusCode, code, message, data)` builder, a `SuccessResponse` catalog of named senders with predefined codes/messages, and an `ErrorResponse` catalog of named factories returning `AppError` instances with predefined error codes and default messages. Controllers SHALL respond via `SuccessResponse` entries and raise failures by throwing `ErrorResponse` entries, so all error responses still exit through the global error handler.

#### Scenario: Success catalog used by a controller

- **WHEN** a controller completes successfully
- **THEN** it responds through a named `SuccessResponse` entry rather than constructing the envelope inline

#### Scenario: Error catalog routes through the error pipeline

- **WHEN** code raises a failure via an `ErrorResponse` entry
- **THEN** an `AppError` carrying the predefined error code is thrown and the global error handler produces the error envelope

### Requirement: Domain error codes for upstream failures

Distinct Ollama failure modes SHALL map to distinct error codes — unreachable/timeout → `LLM_UNAVAILABLE`, non-2xx → `LLM_ERROR_RESPONSE`, empty output → `LLM_EMPTY_RESPONSE` — all surfaced as HTTP 502.

#### Scenario: Distinguishable upstream failures

- **WHEN** Ollama returns a non-2xx status
- **THEN** the response is HTTP 502 with `code: "LLM_ERROR_RESPONSE"`
