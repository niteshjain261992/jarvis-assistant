## Context

Today `client-task-broker.ts` couples two responsibilities: (1) WebSocket request/response correlation via `requestFromClient`, and (2) action-row persistence via `persistPendingAction`, `persistCompletedAction`, and `persistFailedAction`. Client tools pass an optional `ClientTaskPersistenceContext` into the broker so action rows are inserted before delegation and updated on terminal states.

Server-side tools (starting with `web_search` in a follow-on change) need the same pending → completed/failed lifecycle but cannot use the broker — they execute on the backend with no WebSocket round-trip. Persistence logic must be extracted so both paths share one wrapper.

## Goals / Non-Goals

**Goals:**

- Introduce `withToolPersistence` in `src/agent/tools/tool-persistence.ts` as the single persistence lifecycle for all tools
- Slim the broker to WebSocket delegation only (no `messageRepository` usage)
- Move `ClientTaskPersistenceContext` canonical definition to `tool-persistence.ts`; preserve public re-exports via `types.ts` and `index.ts`
- Update existing client tools to wrap `requestFromClient` with `withToolPersistence` when context is present
- Maintain existing behavior: no persistence when context is absent; play_music CLIENT_TIMEOUT still returns graceful result after failed row

**Non-Goals:**

- Implement `web_search` or Tavily integration (establishes pattern only)
- Change `ClientTaskPersistenceContext` field names
- Modify `message-envelope.ts`, `messages.gateway.ts`, or WebSocket message contract
- Change action row schema or add new message fields

## Decisions

### 1. Wrapper owns messageId generation

`withToolPersistence` generates `messageId` internally via `randomUUID()`. Callers pass only context, action metadata, executor, and an `execute()` lambda.

**Rationale:** One less parameter; broker's `requestId` (WebSocket correlation) is intentionally decoupled from the DB action row id.

**Alternative considered:** Reuse broker `requestId` as action `_id` — rejected because server tools have no broker requestId.

### 2. Persistence errors are non-fatal

`insertPendingToolAction`, `completePendingToolAction`, and `failPendingToolAction` log and swallow DB errors — matching today's broker behavior.

**Rationale:** Tool execution must not fail because persistence failed; observability via logs is sufficient.

### 3. Error re-thrown after fail persistence

On execute failure, `withToolPersistence` persists `status: 'failed'` then re-throws the original error.

**Rationale:** Callers (`handleJarvisError`, agent runner) own error flow; wrapper only records state.

### 4. Context guard at call site

Tools use `context ? withToolPersistence(...) : execute()` — same conditional as today's broker.

**Rationale:** Tests and code paths without a real conversation skip DB writes.

### 5. play_music try/catch wraps withToolPersistence, not execute lambda

The `handleJarvisError` catch stays outside `withToolPersistence`. On CLIENT_TIMEOUT, the wrapper persists failed, re-throws, and the tool catch converts to a successful `ToolHandlerResult`.

**Rationale:** DB reflects accurate failure; UX remains graceful for timeouts.

### 6. play_music passes executor `'client'` to withToolPersistence

Despite server-side URL resolution, the delegated step runs on the client — `actionExecutor` on the row should be `'client'`.

### 7. requestFromClient signature change

Remove optional `context` parameter. Signature becomes `(ws, action, input, timeoutMs?)`.

**Rationale:** Clear separation — broker = WebSocket only; tools = persistence via wrapper.

## Risks / Trade-offs

- **[Breaking internal API]** Any code passing `context` to `requestFromClient` must migrate → Mitigated: only three tool files and tests reference it; grep verification in checklist
- **[requestId ≠ action messageId]** WebSocket `requestId` and DB `_id` are now independent → Mitigated: intentional; resolve/reject correlation unchanged; only persistence id differs from requestId (was already tied when context provided — behavior change for action row id vs requestId) → **Note:** Previously when context was provided, actionMessageId WAS requestId. After this change, requestId and action row _id diverge. This is acceptable per user spec — they explicitly want messageId generated inside withToolPersistence separately from broker requestId.

Wait - this is an important design consideration. The user explicitly said:
- messageId is generated inside withToolPersistence
- requestId = randomUUID() in broker (separate)

So the action row _id will NO LONGER equal the WebSocket requestId. The old behavior tied them when context was provided. The user's spec explicitly wants this separation. I should note this in risks.

- **[Dual UUID on client path]** Client tools now have two UUIDs (action row + WebSocket requestId) → Acceptable; WebSocket contract unchanged; action rows still correlate via conversation/parent/sequence

## Migration Plan

1. Add `tool-persistence.ts` and tests
2. Strip persistence from broker; update broker tests
3. Update client tools to use wrapper; update tool tests
4. Update barrel exports and type imports
5. Run `npm test`; verify grep checklist

No deployment migration — pure refactor with same external WebSocket behavior.

## Open Questions

None — scope and API are fully specified in the change request.
