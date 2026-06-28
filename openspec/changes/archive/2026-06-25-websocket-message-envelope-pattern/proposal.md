## Why

The WebSocket gateway currently handles inbound frames with two ad-hoc shapes — a flat `{ "prompt": string }` for chat and separate `{ "type": "client_task_result" | "client_task_error" }` frames for client-task broker callbacks. Adding a third inbound message type (and more later) will require growing conditional logic in `messages.gateway.ts` with no shared validation or routing structure. A uniform inbound Message Envelope Pattern makes every client frame parseable the same way and routes control to dedicated controllers by `type`.

## What Changes

- Introduce a shared inbound WebSocket envelope: `{ type, message_id, timestamp, payload }` validated with Zod schemas under `src/schemas/websocket/`.
- Define initial message types `USER_PROMPT` and `ACTION_ACK` with typed payloads.
- Refactor `messages.gateway.ts` to parse the envelope once, dispatch by `type` to dedicated WebSocket controller modules, and keep outbound `{ code, message, data }` responses unchanged.
- Add `src/controllers/websocket/user-prompt.controller.ts` and `src/controllers/websocket/action-ack.controller.ts` (thin handlers that delegate to existing services/broker).
- **BREAKING**: Clients MUST send the new envelope format. Legacy `{ "prompt": "..." }` and `{ "type": "client_task_result" | "client_task_error" }` frames are no longer accepted.
- Update gateway and controller unit tests; add schema validation tests.

## Capabilities

### New Capabilities

- `websocket-inbound-envelope`: Shared inbound envelope shape, Zod discriminated-union validation, and error formatting for unknown or malformed types.
- `websocket-message-controllers`: Type-based dispatch from the gateway to controller modules with a consistent handler signature.

### Modified Capabilities

- `websocket-messages`: Inbound protocol moves from flat prompt / client-task frames to the envelope pattern; gateway routing requirements updated.
- `client-task-broker`: Client completion frames arrive as `ACTION_ACK` envelopes; broker resolve/reject is invoked from the action-ack controller instead of gateway inline handling.

## Impact

- **Code (new)**: `src/schemas/websocket/inbound-envelope.schema.ts`, `src/schemas/websocket/user-prompt.schema.ts`, `src/schemas/websocket/action-ack.schema.ts`, `src/controllers/websocket/user-prompt.controller.ts`, `src/controllers/websocket/action-ack.controller.ts`, `src/controllers/websocket/types.ts`
- **Code (modify)**: `src/websocket/messages.gateway.ts`, `src/schemas/message-request.schema.ts` (may be folded into user-prompt payload schema or deprecated)
- **Tests (modify/new)**: `tests/websocket/messages.gateway.test.ts`, new `tests/schemas/websocket/*.test.ts`, new `tests/controllers/websocket/*.test.ts`
- **Non-impact**: Outbound server envelope (`message-envelope.ts`), message pipeline service, agent runner, HTTP routes, MongoDB models unchanged
- **Breaking**: Mobile/client WebSocket senders must adopt the new envelope before upgrading
