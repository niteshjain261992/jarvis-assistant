## Context

Client-executor tools delegate work to the connected iOS client through `requestFromClient` in `client-task-broker.ts`. The broker correlates in-memory promises by `requestId` and sends an `actionRequestEnvelope` with `data.type: 'action'` and `data.status: 'pending'`. The message pipeline already inserts a user row and an assistant placeholder (`status: 'processing'`) before `runAgent` runs. When the agent selects a client tool, the tool handler blocks on `requestFromClient` until `resolveClientTask` or `rejectClientTask` fires from the gateway.

Today, MongoDB only reflects the final outcome: `runAgentTurn` updates the assistant placeholder to `type: 'action'`, `status: 'completed'` after the tool (and client round-trip) finishes. There is no durable `pending` row during delegation, and `actionResult` is not written at resolve time — the client outcome lives only inside `actionPayload.result` on the final pipeline update.

## Goals / Non-Goals

**Goals:**

- Persist the assistant message as `type: 'action'`, `status: 'pending'` when `requestFromClient` delegates to the client
- On `resolveClientTask`, set `status: 'completed'` and persist `actionResult` on the correlated message row
- On `rejectClientTask` and broker timeout, set `status: 'failed'` with `errorDetails`
- Use the assistant placeholder `_id` as `requestId` so WebSocket correlation and MongoDB `_id` are identical
- Thread minimal persistence context from `message.service` through agent tools without global mutable state
- Keep the final WebSocket `MESSAGE_COMPLETED` response shape unchanged for client-action turns

**Non-Goals:**

- Persisting pending tasks across server restart or WebSocket reconnect
- Changing inbound `client_task_result` / `client_task_error` frame shapes
- New message rows per delegation (reuse the existing assistant placeholder)
- HTTP message paths

## Decisions

### 1. Reuse assistant placeholder as the persisted action message

**Choice:** Update the existing assistant placeholder row (created in dual insert) rather than inserting a third message.

**Rationale:** Preserves two-message-per-turn invariant, `parentId` linkage, and `sequenceNumber` ordering. The placeholder already represents the in-flight assistant response.

**Alternative:** Insert a separate action message keyed by `requestId` — rejected because it breaks sequence semantics and duplicates assistant representation.

### 2. `requestId` equals assistant `messageId`

**Choice:** Introduce `ClientTaskPersistenceContext` with `{ messageId, conversationId }`. `requestFromClient` uses `context.messageId` as `requestId` when context is provided.

**Rationale:** Single key for broker map, WebSocket envelope, and MongoDB `_id`. No secondary lookup table.

**Alternative:** Random `requestId` with `messageId` stored in pending map — works but adds indirection; chosen only if context-less broker calls must remain supported (tests without DB can omit context).

### 3. Persistence writes live in the broker

**Choice:** `requestFromClient` calls `messageRepository.updateMessage` to set `type: 'action'`, `status: 'pending'`, `actionName`, `actionExecutor: 'client'`, `actionPayload`. `resolveClientTask` / `rejectClientTask` / timeout handler call `updateMessage` for terminal states.

**Rationale:** Resolve/reject already centralize completion; keeping all delegation lifecycle DB updates in one module matches the in-memory correlation model.

**Alternative:** Separate `client-task-persistence.service.ts` — unnecessary for three update calls.

**Normalization:** Coerce `result` to `Record<string, unknown>` for `actionResult` (wrap non-objects as `{ value: result }`).

### 4. Thread context through tool factories

**Choice:**

- Add `ClientTaskPersistenceContext` to `src/agent/tools/types.ts`
- Change `ClientToolFactory` to `(ws: WebSocket, context?: ClientTaskPersistenceContext) => ToolDefinition`
- `buildToolsForConnection(ws, context?)` passes context into each `build*Tool`
- `runAgent(input, ws, context?)` forwards context to `buildToolsForConnection`
- `runAgentTurn` passes `{ messageId: assistantMessageId, conversationId }` from `PipelineContext`

**Rationale:** Explicit parameter threading matches existing `ws` factory pattern; no `AsyncLocalStorage` or `ws` augmentation.

### 5. Pipeline finalization for client actions

**Choice:** In `runAgentTurn`, when `actionExecutor === 'client'`, read the assistant row (or trust broker completion) and:

- Set `model` on the assistant row if not already set
- Do **not** overwrite `status`, `actionResult`, or `actionPayload` if the row is already `completed` with `actionResult`
- Build `CreateMessageResult` including `actionResult` from the persisted row for the WebSocket response

**Rationale:** `resolveClientTask` owns completion timing; pipeline still owns `lastSequenceNumber`, summary job, and response envelope.

### 6. Persistence failures are non-fatal to delegation

**Choice:** Wrap broker DB updates in try/catch; log errors but still send the WebSocket frame and resolve/reject the in-memory promise.

**Rationale:** Client delegation must not fail silently from a secondary persistence error; logging preserves operability while surfacing data issues.

### 7. Test strategy

**Choice:**

- Mock `messageRepository` in broker tests: assert `updateMessage` on request (pending), resolve (completed + `actionResult`), reject/timeout (failed)
- Update tool tests to pass mock context and assert `requestFromClient` receives it
- Add or extend message-pipeline test for client-action row transitions if a service test file exists; otherwise cover via broker + integration-style agent-runner mock

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| DB update fails while WS delegation succeeds | Log and continue; in-memory promise still resolves |
| `runAgentTurn` overwrites broker-completed row | Explicit skip when `status === 'completed'` and `actionResult` present |
| Tests calling `requestFromClient` without context | Context optional; no DB writes when omitted |
| `actionResult` shape varies (object vs primitive) | Normalize to `Record<string, unknown>` on persist |
| Server restart loses in-memory pending map | Documented non-goal; orphaned `pending` rows possible (future cleanup job) |

## Migration Plan

1. Add `ClientTaskPersistenceContext` type and extend tool factory signatures
2. Implement broker persistence (pending / completed / failed)
3. Wire context through `runAgent` and `runAgentTurn`
4. Adjust `runAgentTurn` client-action finalization
5. Update unit tests; run `npm test`
6. No MongoDB schema migration — existing `messages` fields suffice

Rollback: revert deploy; no data migration required. Rows stuck in `pending` after rollback are acceptable edge cases.

## Open Questions

None — requirements are fully specified in the change request.
