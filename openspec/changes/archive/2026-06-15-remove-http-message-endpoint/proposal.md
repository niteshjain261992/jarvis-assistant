## Why

WebSocket support is now in place and clients are migrating to persistent connections for message exchange. Keeping `POST /messages` duplicates the transport surface, adds maintenance overhead (controller, route, REST-specific tests), and invites drift between HTTP and WebSocket behavior. Removing the REST endpoint simplifies the API to a single WebSocket interface.

## What Changes

- Remove `POST /messages` HTTP route, controller, and route module
- Unregister `/messages` from `createApp()` in `src/app.ts`
- **BREAKING**: Clients that call `POST /messages` must switch to WebSocket (`ws://host:PORT` with `{ "prompt": string }` frames)
- Keep `GET /health`, shared HTTP server bootstrap, and WebSocket message handler unchanged
- Remove or relocate REST-only tests (`tests/controllers/message.controller.test.ts`); update `tests/app.test.ts` if it references `/messages`
- Update OpenSpec delta specs and codebase interface docs to reflect WebSocket-only message submission

## Capabilities

### New Capabilities

_None — no new capabilities introduced._

### Modified Capabilities

- `async-messages`: Message submission SHALL be WebSocket-only; remove REST `POST /messages` requirements and REST/WebSocket equivalence scenarios
- `websocket-messages`: Validation and pipeline references SHALL no longer cite `POST /messages` as the parallel transport
- `websocket-server`: Shared listener scenario SHALL list only `GET /health` for HTTP, not `POST /messages`
- `message-pipeline`: Transport references SHALL describe WebSocket submission instead of `POST /messages` (pipeline behavior unchanged)
- `api-response`: Remove or narrow `MESSAGE_COMPLETED` / `MESSAGE_FAILED` HTTP response helpers if they become unused after controller removal (WebSocket uses envelope utilities in `message-envelope.ts`)

## Impact

- **Breaking API**: `POST /messages` removed — mobile/desktop clients must use WebSocket
- **Code removed**: `src/controllers/message.controller.ts`, `src/routes/message.route.ts`
- **Code modified**: `src/app.ts`, `openspec/codebase/interfaces/http.md`, `openspec/codebase/interfaces/message.md`, `openspec/codebase/map.md`
- **Tests removed/updated**: `tests/controllers/message.controller.test.ts` (delete), `tests/app.test.ts` (remove `/messages` POST test)
- **Unchanged**: `src/services/message.service.ts`, `src/websocket/messages.gateway.ts`, `src/schemas/message-request.schema.ts`, `src/utils/message-envelope.ts`, `GET /health`
