## Context

Client-executor tools under `src/agent/tools/` are static `ToolDefinition` objects built at module load. Each handler synchronously returns `{ commandName, executor, payload }` from local metadata — no round-trip to the WebSocket client. The agent runner (`runAgent`) binds tools via `getStructuredTools()` and, on action resolution, may re-invoke the tool handler to obtain payload rather than reading the ToolMessage the graph already produced.

WebSocket chat flow today: `messages.gateway.ts` → `createMessage(prompt)` → `runAgentTurn` → `runAgent({ prompt, context, summary })`. The gateway holds the per-session `WebSocket` but does not pass it downstream.

All three registered tools are client executors (`open_camera`, `off_lights`, `play_music`).

## Goals / Non-Goals

**Goals:**

- Bidirectional client-task delegation: server sends `client_task`, client responds with `client_task_result` or `client_task_error`, tool handler awaits real outcome
- Per-connection tool factories bound to the session's `WebSocket`
- `runAgent(input, ws)` builds tools per call via `buildToolsForConnection(ws)`
- `resolveAgentRunResult` reads action payload from ToolMessage content after the graph completes (includes client `result`)
- Timeout (10s) with map cleanup; late responses after timeout are no-ops
- Client task errors/timeouts propagate to `runAgent` catch → existing `kind: 'clarify'` path with `CLARIFY_FALLBACK`
- Full unit test coverage for broker, tools, registry, agent-runner, gateway routing

**Non-Goals:**

- iOS client implementation of `client_task` handling
- Persistence of in-flight client tasks across server restart or reconnect
- Changes to command-catalog semantics or new tools
- Changes to `CLARIFY_FALLBACK` wording or new outcome kinds
- HTTP-only message paths (WebSocket-only for client delegation)

## Decisions

### 1. Client-task broker as module-level in-memory map

**Choice:** `src/websocket/client-task-broker.ts` with `Map<string, { resolve, reject }>` keyed by `requestId` from `crypto.randomUUID()`. Exports `requestFromClient`, `resolveClientTask`, `rejectClientTask`.

**Rationale:** Request IDs are globally unique; a single map suffices without per-connection scoping. `resolveClientTask` / `rejectClientTask` no-op on unknown IDs (handles timeout race with late client response).

**Alternative:** Per-connection maps — unnecessary given UUID uniqueness; adds cleanup on disconnect complexity.

**Limitation:** Pending requests are lost on server restart. Documented; not solved in this change.

### 2. Timeout constant and cleanup

**Choice:** `CLIENT_TASK_TIMEOUT_MS = 10_000`. On timeout: delete map entry, then reject promise with timeout error.

**Rationale:** Prevents stale entries if client responds after deadline; matches user requirement.

### 3. WebSocket message shapes

**Outbound (`client_task`):**

```json
{ "type": "client_task", "requestId": "<uuid>", "action": "OPEN:CAMERA", "input": { "target": "camera" } }
```

**Inbound success (`client_task_result`):**

```json
{ "type": "client_task_result", "requestId": "<uuid>", "result": <any> }
```

**Inbound failure (`client_task_error`):**

```json
{ "type": "client_task_error", "requestId": "<uuid>", "error": "<message>" }
```

**Rationale:** Separate `type` discriminator matches existing gateway pattern (JSON parse → route by shape). Explicit error type avoids ambiguous result parsing.

### 4. Gateway routing order

**Choice:** In `handleRawMessage`, after JSON parse, check `type` for `client_task_result` / `client_task_error` first. Only frames without those types (or with `{ prompt }` shape) continue to `messageRequestSchema` validation and `createMessage`.

**Rationale:** Client-task completions are not user turns; must not enter the agent loop as chat messages.

### 5. Tool factory pattern

**Choice:** Export `ClientToolFactory = (ws: WebSocket) => ToolDefinition`. Each client tool file exports unchanged `*Metadata` plus `build*Tool(ws)`. Handler calls `requestFromClient(ws, metadata.commandName, metadata.payload)` and returns payload merged with `result: clientResult`.

**Rationale:** Tools need the session WebSocket; factories are the minimal per-connection binding without global mutable state on tool definitions.

**Error propagation:** Do not catch broker rejections inside tool `func`; let `runAgent`'s top-level try/catch return clarify.

### 6. Registry refactor

**Choice:**

- `buildToolsForConnection(ws)` → calls each `build*Tool(ws)`, returns fresh array
- Static metadata table (`TOOL_METADATA`) sourced from `*Metadata` exports for `getToolByCommandName` and uniqueness assertion at module load
- Remove `getAllTools` / `getStructuredTools` from public API unless still needed elsewhere (grep confirms only agent-runner)

**Rationale:** Metadata lookup does not require `ws`; separation keeps `getToolByCommandName` usable without a connection.

### 7. Agent runner changes

**Choice:**

- Signature: `runAgent(input, ws: WebSocket)`
- Tools: `buildToolsForConnection(ws).map(d => d.tool)`
- `resolveAgentRunResult(messages)`: find the AIMessage with non-empty `tool_calls` (scan from end or use existing "find tool-call message" logic — not only assume last message is AIMessage with tool_calls when ReAct produces ToolMessage after). Locate matching ToolMessage by `tool_call_id`. Parse ToolMessage content as `ToolHandlerResult` for `actionPayload`. Use metadata table / `getToolByCommandName` for `actionName` and `actionExecutor`.
- Do **not** re-invoke `definition.tool.invoke` in `resolveAgentRunResult`

**Rationale:** Tool already ran inside the graph with real client round-trip; re-invoking would duplicate client tasks or return stale static data.

### 8. Pipeline wiring (`message.service.ts`)

**Choice:** `createMessage(prompt, ws: WebSocket)` and `runAgentTurn(ctx, ws)` pass `ws` to `runAgent`. Gateway calls `createMessage(validated.data.prompt, ws)`.

**Rationale:** Required for `runAgent`'s new signature; minimal surface change (gateway is the only production caller).

### 9. Test strategy

**Choice:**

- Broker: unit tests with fake timers for timeout, resolve/reject/no-op paths
- Tools: mock `ws.send`, call `resolveClientTask` after `requestFromClient`; separate timeout/rejection test
- Agent-runner: mock `ws`, mock broker or full tool chain; assert `actionPayload` includes client `result`
- Gateway: test `client_task_result` routes to broker without calling `createMessage`

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Late client response after timeout resolves nothing | Map entry deleted on timeout; `resolveClientTask` no-ops |
| Server restart loses pending tasks | Document limitation; client should retry on reconnect (future) |
| ReAct message order: last message may be ToolMessage not AIMessage | Scan messages for AIMessage with `tool_calls` + matching ToolMessage; covered by agent-runner tests |
| Blocking agent loop for up to 10s per client tool | Acceptable for three client tools; timeout bounds wait |
| iOS client not yet implemented | Backend ready; manual verification deferred until client support |

## Migration Plan

1. Add `client-task-broker.ts` with tests
2. Refactor tool types, factories, registry, and tool tests
3. Update agent-runner and tests
4. Update gateway routing (+ tests) and message.service wiring
5. Run full `npm test`
6. Manual end-to-end verification once iOS handles `client_task`

No rollback complexity — revert is a single deploy; no schema migrations.

## Open Questions

None — requirements fully specified in the change request.
