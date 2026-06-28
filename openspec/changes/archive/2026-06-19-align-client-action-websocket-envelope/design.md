## Context

`messages.gateway.ts` sends all chat pipeline responses via `sendEnvelope(ws, envelope)` where `MessageEnvelope` is `{ code, message, data }` from `message-envelope.ts`. Completed action results in `data` already use `type: 'action'` with `actionName`, `actionExecutor`, `actionPayload`, and `status`.

`client-task-broker.ts` line 37 currently sends a flat object `{ type: 'client_task', requestId, action, input }`, which is inconsistent and uses different field names (`action` vs `actionName`, `input` vs `actionPayload`).

## Goals / Non-Goals

**Goals:**

- Outbound client delegation uses the same envelope wrapper as `sendEnvelope`
- `data.type === 'action'` so clients can share action-handling logic
- Field names align with `CreateMessageResult` action fields plus `requestId` for broker correlation
- Centralize envelope construction in `message-envelope.ts`

**Non-Goals:**

- Changing inbound `client_task_result` / `client_task_error` routing or shapes
- Changing broker timeout/correlation logic
- Adding a new success code enum value unless necessary (prefer reusing an existing code with a distinct `data.status`)

## Decisions

### 1. Envelope builder in message-envelope.ts

**Choice:** Add `actionRequestEnvelope({ requestId, actionName, actionPayload, actionExecutor })` returning `MessageEnvelope`.

**Shape:**

```typescript
{
  code: 'ACTION_REQUEST',  // new successCodes entry, or document rationale if reusing MESSAGE_COMPLETED
  message: 'Action requested',
  data: {
    type: 'action',
    status: 'pending',
    requestId,
    actionName,
    actionExecutor: 'client',
    actionPayload,
  }
}
```

**Rationale:** Mirrors completed action payloads from `CreateMessageResult` but adds `requestId` and `status: 'pending'` to distinguish delegation from pipeline completion. Client can branch on `data.status` or `code`.

**Alternative:** Reuse `MESSAGE_COMPLETED` with `status: 'pending'` — rejected because it conflates completed chat turns with in-flight delegation.

### 2. Broker send path

**Choice:** `requestFromClient` calls `ws.send(JSON.stringify(actionRequestEnvelope(...)))` — same serialization as `sendEnvelope`, optionally import and reuse a small shared `sendEnvelope` helper exported from gateway or duplicated one-liner in broker.

**Rationale:** Keeps broker independent of gateway module while matching wire format exactly.

### 3. Parameter mapping

**Choice:** Keep `requestFromClient(ws, action, input)` signature; map internally to `actionName: action`, `actionPayload: input`, `actionExecutor: 'client'`.

**Rationale:** Minimize call-site churn in tool files.

### 4. Tests

**Choice:** Update `client-task-broker.test.ts` to assert top-level `code`, `message`, `data` keys and `data.type === 'action'`, `data.actionName`, `data.actionPayload`, `data.requestId`.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **BREAKING** wire format for any client expecting `client_task` | Document in proposal; iOS not yet shipped on old shape |
| New `ACTION_REQUEST` code needs client handling | Document in websocket-messages spec alongside MESSAGE_COMPLETED |

## Migration Plan

1. Add `ACTION_REQUEST` to `successCodes` (if new code chosen) and `actionRequestEnvelope` helper
2. Update broker send line
3. Update tests
4. iOS client parses envelope + `data.type === 'action'` + `data.requestId`

## Open Questions

None — user specified `type: 'action'` and envelope consistency explicitly.
