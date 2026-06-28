## Context

`buildPlayMusicTool` in `src/agent/tools/play-music/index.ts`:

1. Resolves a platform deeplink via `resolvePlayMusicUrl`.
2. Sends `{ query, platform, url, title, id }` to the mobile client through `requestFromClient`.
3. Returns `{ commandName, executor, payload: { ...resolved, result: clientResult } }`.

`requestFromClient` rejects with `Error('Client task timed out after {N}ms')` when the client does not respond within `playMusicMetadata.clientTimeoutMs` (currently 10s). That rejection currently bubbles up uncaught, which can cause `runAgent` to hit its outer catch and return a generic clarify fallback despite successful server-side resolution.

Other client tools (`open_camera`, `off_lights`) remain client-executor tools where timeout propagation is correct—the action cannot succeed without the client.

## Goals / Non-Goals

**Goals:**

- Catch only client task **timeout** errors from `requestFromClient` inside the `play_music` handler.
- Return a successful `ToolHandlerResult` on timeout with resolved URL fields preserved.
- Include structured timeout metadata in `payload.result` so downstream code and the agent can distinguish timeout from success.
- Keep resolver errors (missing API key, no search results, unsupported platform) propagating.

**Non-Goals:**

- Changing timeout behavior in `client-task-broker.ts`.
- Applying the same pattern to `open_camera` or `off_lights`.
- Catching non-timeout client rejections (e.g. explicit client error via `rejectClientTask`).
- Retrying the client request automatically.

## Decisions

### 1. Catch scope: timeout only, around `requestFromClient`

Wrap only the `requestFromClient` await in try/catch—not the resolver call.

```ts
let clientResult: unknown;
try {
  clientResult = await requestFromClient(...);
} catch (err) {
  if (isClientTaskTimeoutError(err)) {
    clientResult = {
      status: 'client_timeout',
      message: err instanceof Error ? err.message : 'Client task timed out',
    };
  } else {
    throw err;
  }
}
```

**Alternative:** Catch all errors from `requestFromClient`. Rejected—non-timeout client errors should still propagate so the agent knows playback failed explicitly.

### 2. Timeout detection helper

Add `isClientTaskTimeoutError(error: unknown): boolean` in `play-music/client-timeout.ts` (or inline in index) matching broker message: `/Client task timed out after \d+ms/`.

Centralizing avoids brittle string checks scattered in the handler.

### 3. Payload shape on timeout

Return the same top-level payload fields as success:

```ts
{
  query,
  platform,
  url,
  title,
  id,
  result: { status: 'client_timeout', message: 'Client task timed out after 10000ms' }
}
```

The agent action still records `PLAY:MUSIC` with the resolved URL; the client simply did not confirm in time.

### 4. Spec exception for play_music

The global agent-tools requirement says tool handler errors propagate. Add an explicit carve-out: **`play_music` MAY catch client task timeouts** because server resolution already succeeded and the URL is actionable even without client ack.

Other tools unchanged.

## Risks / Trade-offs

- **[Risk] Agent treats timeout as success** → **Mitigation:** `result.status === 'client_timeout'` is explicit; message service / UI can surface a softer warning later.
- **[Risk] Fragile timeout string matching** → **Mitigation:** Helper tests assert against the exact broker message format; consider exporting a shared error code from broker in a future change.
- **[Risk] Inconsistent error handling across tools** → **Mitigation:** Documented as play_music-only exception in spec and design.

## Migration Plan

1. Add timeout helper and try/catch in `play-music/index.ts`.
2. Update unit tests (replace "propagates rejection when requestFromClient fails" with separate timeout vs non-timeout cases).
3. No client or broker changes required.

## Open Questions

_None — timeout-only catch with structured `result.status` is sufficient for v1._
