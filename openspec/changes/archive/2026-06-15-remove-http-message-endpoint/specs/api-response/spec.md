## MODIFIED Requirements

### Requirement: Typed response catalogs

The system SHALL provide in `src/utils/api-response.ts`: `successCodes` and `errorCodes` string enums, a `successResponse(res, httpStatusCode, code, message, data)` builder, a `SuccessResponse` catalog of named senders with predefined codes/messages for HTTP endpoints, and an `ErrorResponse` catalog of named factories returning `AppError` instances with predefined error codes and default messages. HTTP controllers SHALL respond via `SuccessResponse` entries and raise failures by throwing `ErrorResponse` entries. Message outcome codes (`MESSAGE_COMPLETED`, `MESSAGE_FAILED`) remain in `successCodes` for WebSocket envelopes but SHALL NOT require dedicated `SuccessResponse` HTTP senders once the message controller is removed.

#### Scenario: Success catalog used by a controller

- **WHEN** a controller completes successfully
- **THEN** it responds through a named `SuccessResponse` entry rather than constructing the envelope inline

#### Scenario: Error catalog routes through the error pipeline

- **WHEN** code raises a failure via an `ErrorResponse` entry
- **THEN** an `AppError` carrying the predefined error code is thrown and the global error handler produces the error envelope

#### Scenario: Message codes used by WebSocket only

- **WHEN** the WebSocket handler maps a `createMessage` result to an outbound envelope
- **THEN** it uses `successCodes.MESSAGE_COMPLETED` or `successCodes.MESSAGE_FAILED` via `message-envelope.ts`, not `SuccessResponse` HTTP helpers
