# api-response Specification

## Purpose

Define the unified API response contract: a single `{ code, message, data }` envelope for every success and error response, backed by typed code catalogs and named response builders so controllers never construct envelopes inline.

## Requirements

### Requirement: Unified response envelope

Every JSON response from the API, success or error, SHALL use the envelope `{ "code": string, "message": string, "data": object }`, where `code` is a machine-readable member of a central success/error code enum, `message` is a human-readable summary, and `data` carries the payload (defaulting to `{}` when there is none, including on errors).

#### Scenario: Success envelope

- **WHEN** any endpoint responds successfully
- **THEN** the body is `{ code, message, data }` with the payload inside `data` and `code` a member of `successCodes`

#### Scenario: Error envelope

- **WHEN** any request fails (validation, unknown route, upstream failure, or unexpected error)
- **THEN** the body is `{ code, message, data: {} }` where `code` is a member of `errorCodes` (e.g. 400 → `BAD_REQUEST`)

### Requirement: Typed response catalogs

The system SHALL provide in `src/utils/api-response.ts`: `successCodes` and `errorCodes` string enums, a `successResponse(res, httpStatusCode, code, message, data)` builder, a `SuccessResponse` catalog of named senders with predefined codes/messages for HTTP endpoints, and an `ErrorResponse` catalog of named factories returning `AppError` instances with predefined error codes and default messages. HTTP controllers SHALL respond via `SuccessResponse` entries and raise failures by throwing `ErrorResponse` entries. Message outcome codes (`MESSAGE_COMPLETED`, `MESSAGE_FAILED`) and client-action delegation code (`ACTION_REQUEST`) remain in `successCodes` for WebSocket envelopes but SHALL NOT require dedicated `SuccessResponse` HTTP senders once the message controller is removed.

#### Scenario: Success catalog used by a controller

- **WHEN** a controller completes successfully
- **THEN** it responds through a named `SuccessResponse` entry rather than constructing the envelope inline

#### Scenario: Error catalog routes through the error pipeline

- **WHEN** code raises a failure via an `ErrorResponse` entry
- **THEN** an `AppError` carrying the predefined error code is thrown and the global error handler produces the error envelope

#### Scenario: Message codes used by WebSocket only

- **WHEN** the WebSocket handler maps a `createMessage` result to an outbound envelope
- **THEN** it uses `successCodes.MESSAGE_COMPLETED` or `successCodes.MESSAGE_FAILED` via `message-envelope.ts`, not `SuccessResponse` HTTP helpers

#### Scenario: Action request code used by WebSocket delegation

- **WHEN** `requestFromClient` sends an outbound client-action frame
- **THEN** it uses `successCodes.ACTION_REQUEST` via `actionRequestEnvelope` in `message-envelope.ts`, not `SuccessResponse` HTTP helpers

### Requirement: Domain error codes for upstream failures

Distinct Ollama failure modes SHALL map to distinct error codes — unreachable/timeout → `LLM_UNAVAILABLE`, non-2xx → `LLM_ERROR_RESPONSE`, empty output → `LLM_EMPTY_RESPONSE` — all surfaced as HTTP 502.

#### Scenario: Distinguishable upstream failures

- **WHEN** Ollama returns a non-2xx status
- **THEN** the response is HTTP 502 with `code: "LLM_ERROR_RESPONSE"`
