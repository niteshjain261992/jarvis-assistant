## Why

The `play_music` tool resolves a track URL on the server, then asks the mobile client to open it via `requestFromClient`. When the client does not respond in time, the broker rejection currently propagates out of the tool handler and can fail the whole agent run—even though the server already found the correct music URL. The handler should tolerate client-side timeouts and still return a successful tool result with the resolved URL.

## What Changes

- Wrap the `play_music` tool handler's `requestFromClient` call in a `try/catch` that catches client task timeout errors.
- On client timeout, return a normal `ToolHandlerResult` with the already-resolved `{ query, platform, url, title, id }` and a structured timeout indicator in `payload.result` (e.g. `{ status: 'client_timeout', message: '...' }`).
- Continue to propagate resolver failures and non-timeout client errors without catching them.
- Add a small helper to detect broker timeout errors by message pattern.
- Update unit tests for timeout graceful handling; keep resolver error propagation tests.
- Update agent-tools spec to document the play_music-specific exception to the general "errors propagate" rule.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `agent-tools`: `play_music` handler catches client task timeouts and returns a successful tool result with resolved URL plus timeout metadata; other tools and other error types still propagate.

## Impact

- **Code**: `src/agent/tools/play-music/index.ts`, `tests/agent/tools/play-music.tool.test.ts`
- **Agent behavior**: Client timeout on `PLAY:MUSIC` no longer fails the agent invoke; action payload still includes resolved `url`
- **Client contract**: `payload.result` may contain `{ status: 'client_timeout', message }` when the mobile app did not ack in time
- **Docs**: `openspec/codebase/interfaces/agent-tools.md` (optional note on timeout handling)
