## Context

Jarvis accepts user chat and client-task completions on a single WebSocket connection (`src/websocket/messages.gateway.ts`). Today:

- Chat prompts arrive as `{ "prompt": string }` validated by `message-request.schema.ts`.
- Client-task completions arrive as ad-hoc `{ "type": "client_task_result" | "client_task_error", "requestId", ... }` handled inline in `handleClientTaskFrame`.
- Outbound responses already use a separate `{ code, message, data }` envelope in `message-envelope.ts` — this change does **not** alter outbound shape.

The product direction is a uniform **inbound** Message Envelope Pattern so new message types (location updates, preference sync, etc.) can be added without growing gateway conditionals.

Existing patterns to follow:

- Zod schemas in `src/schemas/` with `format*ValidationError` helpers.
- Controllers as thin orchestration layers (`src/controllers/health.controller.ts`).
- WebSocket tests under `tests/websocket/` with mocked services.

## Goals / Non-Goals

**Goals:**

- Every inbound WebSocket JSON frame MUST conform to `{ type, message_id, timestamp, payload }`.
- Gateway parses once, validates with a discriminated union, and dispatches to a type-specific controller.
- Initial types: `USER_PROMPT` (replaces flat prompt) and `ACTION_ACK` (replaces `client_task_result` / `client_task_error`).
- Preserve existing outbound `{ code, message, data }` responses and message-pipeline behavior for valid prompts.
- Unit tests for schemas, controllers, and updated gateway routing.

**Non-Goals:**

- Changing outbound server envelope shape or `requestFromClient` outbound frames.
- New message types beyond `USER_PROMPT` and `ACTION_ACK` (future changes add controllers + schema arms).
- HTTP REST endpoints, authentication, or persistence changes.
- Backward compatibility with legacy inbound frame shapes.

## Decisions

### 1. Inbound envelope field naming (snake_case)

Use snake_case keys on the wire to match the product contract:

| Field | Type | Notes |
|-------|------|-------|
| `type` | string enum | `USER_PROMPT`, `ACTION_ACK` |
| `message_id` | string | Client-generated tracking id (UUID recommended, non-empty) |
| `timestamp` | integer | Unix seconds when client sent the frame |
| `payload` | object | Type-specific body |

TypeScript types use camelCase internally only where mapped; Zod schemas validate wire shape directly.

**Alternative:** camelCase (`messageId`). Rejected — product examples use snake_case.

### 2. Schema layout — discriminated union

```
src/schemas/websocket/
  inbound-envelope.schema.ts   # base fields + z.discriminatedUnion('type', [...])
  user-prompt.schema.ts        # USER_PROMPT payload
  action-ack.schema.ts         # ACTION_ACK payload
```

`inboundEnvelopeSchema` is the single entry point for gateway validation. Each payload schema exports its own `format*ValidationError` or the envelope schema provides a unified formatter.

**USER_PROMPT payload:**

```json
{
  "text": "Turn on the living room lights.",
  "input_method": "voice" | "chat"
}
```

Reuse existing prompt rules on `text`: trimmed, non-empty, max 500 chars (same as current `message-request.schema.ts`).

**ACTION_ACK payload:**

```json
{
  "original_server_message_id": "<requestId from server action frame>",
  "action_executed": "PLAY_MUSIC",
  "status": "SUCCESS" | "FAILURE",
  "error_details": string | null
}
```

Mapping to broker:

- `status: "SUCCESS"` → `resolveClientTask(original_server_message_id, { action_executed, status, error_details: null })`
- `status: "FAILURE"` → `rejectClientTask(original_server_message_id, error_details ?? 'Action failed')`

**Alternative:** Keep broker result as opaque `result`. Rejected — product spec defines structured ACK fields; broker resolve value can carry the ACK payload object for tool handlers.

### 3. Controller layer under `src/controllers/websocket/`

Introduce a shared handler context:

```typescript
interface WebSocketControllerContext {
  ws: WebSocket;
  envelope: ParsedInboundEnvelope; // discriminated by type
}
```

Controllers:

| Module | Type | Delegates to |
|--------|------|--------------|
| `user-prompt.controller.ts` | `USER_PROMPT` | `createMessage(payload.text, ws)` + outbound envelope helpers |
| `action-ack.controller.ts` | `ACTION_ACK` | `resolveClientTask` / `rejectClientTask`; no outbound frame |

Gateway flow in `handleRawMessage`:

1. JSON parse → `badRequestEnvelope` on failure
2. `inboundEnvelopeSchema.safeParse` → `badRequestEnvelope` with formatted Zod detail
3. Lookup controller by `type` in a registry map → `badRequestEnvelope('Unknown message type')` if missing
4. `await controller(ctx)` — controllers own try/catch for operational errors where applicable

Remove `handleClientTaskFrame` and direct `messageRequestSchema` usage from the gateway.

**Alternative:** Route inside `message.service.ts`. Rejected — WebSocket transport concerns belong at gateway + controller layer; service stays prompt-focused.

### 4. Deprecate `message-request.schema.ts`

Move prompt validation into `user-prompt.schema.ts` (payload) or re-export from inbound schemas. Delete or thin-wrap `message-request.schema.ts` to avoid duplicate sources of truth. Update imports in gateway tests only.

### 5. ACTION_ACK is fire-and-forget (no server ACK)

Unlike `USER_PROMPT`, successful `ACTION_ACK` handling does not send an outbound `{ code, message, data }` frame — matching current `client_task_result` behavior. Invalid ACK envelopes MAY return `BAD_REQUEST` when validation fails at the gateway.

### 6. Unknown `type` handling

If JSON parses and base envelope fields validate but `type` is not in the registry, respond with `BAD_REQUEST` and keep the connection open.

## Risks / Trade-offs

- **[Risk] Breaking change for existing clients** → **Mitigation:** Document in proposal; client app must ship envelope support before backend deploy. No server-side fallback for legacy shapes.
- **[Risk] `original_server_message_id` must match server `requestId`** → **Mitigation:** Outbound action frames already expose `data.requestId`; client maps this field directly. Spec scenario asserts mapping.
- **[Risk] Controller registry drift** → **Mitigation:** Single `messageControllerRegistry` object in gateway or `controllers/websocket/index.ts`; adding a type requires schema arm + controller + registry entry (tasks checklist).

## Migration Plan

1. Implement schemas, controllers, and gateway refactor with updated tests.
2. Coordinate mobile/client release to send envelope frames.
3. Deploy backend; legacy `{ prompt }` frames receive `BAD_REQUEST`.
4. Rollback: revert gateway + controllers; restore legacy parsing (client must match).

## Open Questions

- None for v1 — additional inbound types (e.g. `LOCATION_UPDATE`) follow the same pattern in a follow-up change.
