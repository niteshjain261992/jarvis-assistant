## 1. Inbound envelope schemas

- [x] 1.1 Create `src/schemas/websocket/user-prompt.schema.ts` with `userPromptPayloadSchema` (`text`, `input_method`) and export inferred types
- [x] 1.2 Create `src/schemas/websocket/action-ack.schema.ts` with `actionAckPayloadSchema` including SUCCESS/FAILURE `error_details` refinement
- [x] 1.3 Create `src/schemas/websocket/inbound-envelope.schema.ts` with base envelope fields and `inboundEnvelopeSchema` discriminated union on `type`
- [x] 1.4 Export `formatInboundEnvelopeValidationError` for gateway BAD_REQUEST messages
- [x] 1.5 Add `tests/schemas/websocket/inbound-envelope.schema.test.ts` covering valid/invalid USER_PROMPT and ACTION_ACK frames

## 2. WebSocket controllers

- [x] 2.1 Create `src/controllers/websocket/types.ts` with `WebSocketControllerContext` and controller function type
- [x] 2.2 Create `src/controllers/websocket/user-prompt.controller.ts` — delegate to `createMessage`, send outbound envelopes, handle AppError/unexpected errors
- [x] 2.3 Create `src/controllers/websocket/action-ack.controller.ts` — map SUCCESS/FAILURE to `resolveClientTask` / `rejectClientTask`, no outbound frame
- [x] 2.4 Create `src/controllers/websocket/index.ts` exporting controller registry keyed by envelope `type`
- [x] 2.5 Add `tests/controllers/websocket/user-prompt.controller.test.ts` mocking `createMessage`
- [x] 2.6 Add `tests/controllers/websocket/action-ack.controller.test.ts` mocking broker functions

## 3. Gateway refactor

- [x] 3.1 Refactor `src/websocket/messages.gateway.ts` to validate with `inboundEnvelopeSchema`, dispatch via controller registry, remove `handleClientTaskFrame` and direct `createMessage` calls
- [x] 3.2 Remove or deprecate `src/schemas/message-request.schema.ts` — consolidate prompt rules into user-prompt payload schema; update any remaining imports
- [x] 3.3 Update `tests/websocket/messages.gateway.test.ts` to send envelope-shaped frames; add legacy `{ prompt }` rejection test; replace client_task tests with ACTION_ACK envelope tests

## 4. Verification

- [x] 4.1 Run `npm test` and fix any failing tests
- [x] 4.2 Run TypeScript build/lint if configured and resolve new errors
