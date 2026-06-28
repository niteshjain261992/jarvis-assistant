## MODIFIED Requirements

### Requirement: Typed response catalogs

The system SHALL provide in `src/utils/api-response.ts`: `successCodes` and `errorCodes` string enums, a `successResponse(res, httpStatusCode, code, message, data)` builder, a `SuccessResponse` catalog of named senders with predefined codes/messages for HTTP endpoints, and an `ErrorResponse` catalog of named factories returning `AppError` instances with predefined error codes and default messages. HTTP controllers SHALL respond via `SuccessResponse` entries and raise failures by throwing `ErrorResponse` entries. Message outcome codes (`MESSAGE_COMPLETED`, `MESSAGE_FAILED`) and client-action delegation code (`ACTION_REQUEST`) remain in `successCodes` for WebSocket envelopes but SHALL NOT require dedicated `SuccessResponse` HTTP senders.

#### Scenario: Message codes used by WebSocket only

- **WHEN** the WebSocket handler maps a `createMessage` result to an outbound envelope
- **THEN** it uses `successCodes.MESSAGE_COMPLETED` or `successCodes.MESSAGE_FAILED` via `message-envelope.ts`, not `SuccessResponse` HTTP helpers

#### Scenario: Action request code used by WebSocket delegation

- **WHEN** `requestFromClient` sends an outbound client-action frame
- **THEN** it uses `successCodes.ACTION_REQUEST` via `actionRequestEnvelope` in `message-envelope.ts`, not `SuccessResponse` HTTP helpers
