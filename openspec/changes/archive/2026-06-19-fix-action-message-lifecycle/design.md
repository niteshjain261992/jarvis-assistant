## Context

Each WebSocket prompt currently creates two MongoDB rows: a completed user message and an assistant placeholder (`status: 'processing'`, `parentId` = user message). When the agent invokes a client-executor tool, `requestFromClient` **updates** the assistant placeholder to `type: 'action'`, `status: 'pending'`, and later to `completed` on `resolveClientTask`. That collapses the assistant turn and the delegated action into one row.

The required audit trail is three sibling records under the user message:

| Step | Row | type | role | parentId | status |
|------|-----|------|------|----------|--------|
| 1 | User request | text | user | null | completed |
| 2 | Assistant turn | text | assistant | user id | processing → completed/failed |
| 3 | Tool delegation | action | assistant | user id | pending → completed/failed |

The assistant placeholder (row 2) must never become `type: 'action'`. Row 3 is inserted when delegation starts and is the sole target for broker terminal updates.

## Goals / Non-Goals

**Goals:**

- Insert a dedicated action message row when a client tool delegates via `requestFromClient`
- Keep the assistant placeholder as `type: 'text'` throughout; finalize it to `completed` or `failed` when the agent turn ends
- Correlate WebSocket `requestId` with the action row `_id` (not the assistant placeholder)
- On `resolveClientTask` / reject / timeout, update only the action row
- For server-executor actions, insert a completed action row (same parent linkage) instead of mutating the assistant placeholder
- Preserve existing WebSocket envelope shapes for outbound action requests and final `MESSAGE_COMPLETED` responses

**Non-Goals:**

- Resuming orphaned `pending` action rows after server restart
- Changing inbound `client_task_result` / `client_task_error` frame shapes
- HTTP message paths
- Including action rows in LLM context (they have no `content`; existing `filterCompletedContextMessages` behavior is sufficient)

## Decisions

### 1. Insert action row in the broker on delegation

**Choice:** Replace `persistPendingAction`'s `updateMessage` on the assistant id with `insertMessage` for a new action row.

**Fields:** `_id` (new UUID), `conversationId`, `parentId` = `userMessageId`, `type: 'action'`, `role: 'assistant'`, `sequenceNumber` from context, `status: 'pending'`, `actionName`, `actionExecutor: 'client'`, `actionPayload`.

**Rationale:** Delegation is the moment the action exists; the broker already owns pending/completed lifecycle writes.

**Alternative:** Insert in `message.service` before tools run — rejected because the action is only known when a tool actually calls the broker.

### 2. Expand `ClientTaskPersistenceContext`

**Choice:**

```typescript
interface ClientTaskPersistenceContext {
  conversationId: string;
  userMessageId: string;
  actionSequenceNumber: number;
}
```

Remove `messageId` (assistant placeholder). `requestFromClient` generates `actionMessageId`, inserts the row, uses `actionMessageId` as `requestId`, and stores it in the pending map for terminal updates.

**Rationale:** Parent linkage and sequence come from the pipeline; action identity is broker-owned at delegation time.

**Threading:** `runAgentTurn` passes `{ conversationId, userMessageId, actionSequenceNumber: assistantSequence + 1 }`.

### 3. Assistant finalization in `runAgentTurn`

**Choice:**

- **`kind: 'text' | 'clarify'`** — unchanged: update assistant row with content and `completed`
- **`kind: 'action'`, `actionExecutor: 'client'`** — load the action row for this turn (query by `parentId: userMessageId`, `type: 'action'`, highest `sequenceNumber` at or below `actionSequenceNumber`, or by reading the row the broker completed); build `CreateMessageResult` from the action row; update assistant row to `status: 'completed'` with `model` only (remain `type: 'text'`, no action fields)
- **`kind: 'action'`, `actionExecutor: 'server'`** — `insertMessage` for action row at `actionSequenceNumber` with `status: 'completed'` and `actionResult`; update assistant row to `status: 'completed'` with `model`

**Rationale:** Separates turn completion (row 2) from action outcome (row 3). WebSocket response still reflects action fields from row 3.

### 4. Sequence and `lastSequenceNumber`

**Choice:** Advance `lastSequenceNumber` to `actionSequenceNumber` when an action row is created (client or server path); otherwise to `assistantSequence`.

**Rationale:** Action row is the last persisted message in action turns.

### 5. Persistence failures remain non-fatal

**Choice:** Broker insert/update errors are logged; WebSocket delegation and in-memory promises still proceed.

**Rationale:** Matches existing broker behavior; client UX must not block on secondary DB failures.

### 6. Test strategy

**Choice:**

- Broker tests: assert `insertMessage` on delegation (not `updateMessage` on assistant id); terminal updates target action id
- Pipeline tests: assert three-row shape for client/server action scenarios; assistant row stays `type: 'text'`
- Tool tests: assert expanded context shape passed to `requestFromClient`

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Pipeline cannot find action row if insert failed | Log insert failure; pipeline treats missing action row as turn failure |
| Multiple actions in one turn (future) | Current agent recursion limit and single-tool resolution keep one action per turn; query uses latest action child of user message |
| Orphaned `pending` rows after crash | Documented non-goal; same as today |
| Spec/tests still reference assistant id as `requestId` | Update broker and tool tests in same change |

## Migration Plan

1. Extend `ClientTaskPersistenceContext` and thread through agent/tools
2. Change broker to insert action rows and correlate by action id
3. Refactor `runAgentTurn` client/server action finalization
4. Update unit tests; run `npm test`
5. No MongoDB schema migration — existing fields suffice

Rollback: revert deploy. Historical rows that were assistant-as-action remain as-is; new turns use the three-row model.

## Open Questions

None — flow is fully specified in the change request.
