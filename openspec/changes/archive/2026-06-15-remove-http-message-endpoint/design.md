## Context

The backend currently exposes message submission on two transports: `POST /messages` (REST) and WebSocket (`ws://host:PORT`). Both call `messageService.createMessage` and share `message-request.schema.ts` for validation. WebSocket responses use `message-envelope.ts`; REST uses `SuccessResponse.MESSAGE_COMPLETED` / `MESSAGE_FAILED` in the message controller.

The user wants a single WebSocket interface. HTTP remains for `GET /health` and the shared `http.Server` that hosts the WebSocket upgrade.

## Goals / Non-Goals

**Goals:**

- Remove the REST message surface (`POST /messages`) and all dead code tied exclusively to it
- Keep WebSocket message handling, pipeline service, schemas, and envelopes unchanged
- Update specs and codebase interface docs to describe WebSocket-only submission
- Maintain test coverage for WebSocket paths; remove REST controller tests

**Non-Goals:**

- Changing `createMessage` pipeline logic, logging, or modular structure
- Adding WebSocket authentication, rooms, or streaming partial responses
- Removing `successCodes.MESSAGE_COMPLETED` / `MESSAGE_FAILED` from the enum (still used by WebSocket envelopes)
- Deprecation period or HTTP redirect — hard removal

## Decisions

### 1. Delete controller and route modules rather than stubbing

Remove `src/controllers/message.controller.ts` and `src/routes/message.route.ts` entirely. Unregister the router from `createApp()`. Unknown `POST /messages` naturally returns 404 via `notFoundHandler`.

**Alternative considered**: Keep route returning 410 Gone — rejected; adds code to maintain with no client benefit if migration is intentional.

### 2. Remove `SuccessResponse.MESSAGE_*` HTTP senders

Delete `MESSAGE_COMPLETED` and `MESSAGE_FAILED` entries from the `SuccessResponse` catalog in `api-response.ts` once the controller is gone. Keep enum values in `successCodes` for `message-envelope.ts`.

**Alternative considered**: Leave unused senders — rejected; dead API surface.

### 3. Update `tests/app.test.ts` malformed-JSON test

The existing test posts malformed JSON to `/messages`. Replace with a different route (e.g. a hypothetical POST body on a non-existent route, or remove if redundant) — simplest fix: use `POST /health` with malformed JSON or drop the test if express.json error path is covered elsewhere.

### 4. Codebase docs updated in same change

Update `openspec/codebase/interfaces/http.md`, `interfaces/message.md`, and `map.md` to remove REST message references.

## Risks / Trade-offs

- **[Breaking change for REST clients]** → Clients must migrate to WebSocket before deploy; document in release notes
- **[404 vs explicit deprecation]** → Clients calling old endpoint get `NOT_FOUND`; acceptable for intentional removal
- **[api-response tests]** → Update `tests/utils/api-response.test.ts` to remove MESSAGE_* HTTP sender tests or keep testing enum values only

## Migration Plan

1. Deploy backend without `POST /messages`
2. Update mobile/desktop clients to use WebSocket for all message turns
3. Rollback: re-add route/controller from git history if needed

## Open Questions

_None — scope is a straightforward transport removal._
