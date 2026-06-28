## Context

`requestFromClient` in `client-task-broker.ts` uses a single module constant `CLIENT_TASK_TIMEOUT_MS` (10 000 ms) for every pending client action. All three client-executor tool factories (`open-camera`, `off-lights`, `play-music`) call the broker without specifying how long to wait. Camera and media operations often need more than 10 seconds; simple device toggles can fail faster to improve UX.

Each tool already exports local `*Metadata` with `commandName`, `phrases`, `executor`, and `payload`. Timeout belongs alongside that metadata — the tool author knows how long the client operation reasonably takes.

## Goals / Non-Goals

**Goals:**

- Allow each client-executor tool to declare its own client wait timeout in local metadata
- Pass the declared timeout from tool handlers into `requestFromClient`
- Keep a shared default (`CLIENT_TASK_TIMEOUT_MS`) when no override is supplied
- Use the resolved timeout for `setTimeout`, rejection messages, and persisted `errorDetails`
- Cover custom and default timeout paths in broker and tool unit tests

**Non-Goals:**

- Environment-variable or runtime configuration of timeouts
- A central timeout registry separate from tool metadata
- Changing WebSocket envelope shape to include timeout
- Per-request timeout negotiation with the client

## Decisions

### 1. Optional fifth parameter on `requestFromClient`

**Choice:** Extend the signature to:

```typescript
requestFromClient(
  ws: WebSocket,
  action: string,
  input: Record<string, unknown>,
  context?: ClientTaskPersistenceContext,
  timeoutMs?: number,
): Promise<unknown>
```

Inside the function, resolve `const effectiveTimeoutMs = timeoutMs ?? CLIENT_TASK_TIMEOUT_MS` and use it for the timer and error strings.

**Rationale:** Minimal change; tools already have all call-site context. Avoids a lookup map keyed by `action` inside the broker (keeps broker action-agnostic).

**Alternative:** Broker resolves timeout from `action` via a shared registry — rejected because it duplicates metadata already owned by each tool file and violates the locally-authored metadata pattern.

### 2. `clientTimeoutMs` on tool metadata

**Choice:** Add `clientTimeoutMs: number` to each `*Metadata` export for tools that call `requestFromClient`. Pass `openCameraMetadata.clientTimeoutMs` (etc.) as the fifth argument.

Initial values (tunable at implementation):

| Tool | commandName | clientTimeoutMs | Rationale |
|------|-------------|-----------------|-----------|
| open-camera | `OPEN:CAMERA` | 30 000 | Camera warm-up / permission prompts |
| off-lights | `OFF:LIGHTS` | 5 000 | Fast local device command |
| play-music | `PLAY:MUSIC` | 15 000 | Client media handoff |

**Rationale:** Co-located with other tool constants; visible to tool authors and tests.

### 3. Keep `CLIENT_TASK_TIMEOUT_MS` as the default fallback

**Choice:** Retain the exported constant at `10_000` for callers that omit the fifth argument and as the documented default in specs.

**Rationale:** Backward compatible for any future or test callers; single source for the default duration.

### 4. Timeout error messages use effective duration

**Choice:** Rejection and persisted `errorDetails` use the resolved `effectiveTimeoutMs` (e.g. `Client task timed out after 30000ms`), not always the default constant.

**Rationale:** Operators debugging slow tools need the actual limit that fired.

## Risks / Trade-offs

- **[Stale timeout values in metadata]** → Document rationale in each tool file; tests assert the value is forwarded to the broker.
- **[Fifth positional parameter grows unwieldy]** → Acceptable for now with four optional-adjacent args; revisit an options object only if more per-request settings are added later.
- **[Inconsistent timeouts across similar future tools]** → Spec requires every client-executor tool to declare `clientTimeoutMs`; registry tests can assert the field exists on metadata exports.

## Migration Plan

1. Extend broker signature and timeout resolution (default unchanged for omitted arg).
2. Add `clientTimeoutMs` to each tool metadata and update `requestFromClient` calls.
3. Update broker tests (custom timeout + default) and tool tests (forwarding assertion).
4. No database migration; no client protocol change.

Rollback: revert broker fifth parameter and tool metadata fields; behavior returns to global 10 s timeout.

## Open Questions

None — initial per-tool values can be adjusted during implementation without spec changes as long as each tool declares an explicit positive integer.
