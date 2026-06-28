## Why

The `openspec/codebase/` mirror lags behind `src/` after the agent-runner and client-task-broker migrations (June 16–19). Agents and humans planning from OpenSpec cannot rely on interface docs alone — `map.md` omits eight files, several signatures are wrong, and new modules have no interface docs. This blocks spec-first workflows.

## What Changes

- Update `openspec/codebase/map.md` — add `src/agent/**` and `src/websocket/client-task-broker.ts`; fix Ollama external-dependency description
- Fix stale interface docs: `message.md`, `websocket.md`, `ollama.md`, `api-response.md`
- Add interface docs: `agent-runner.md`, `agent-tools.md`, `client-task-broker.md`, `message-envelope.md`
- Sync minor spec gaps: `ACTION_REQUEST` in `api-response`, optional `context` on `runAgent` in `agent-runner`

## Capabilities

### New Capabilities

_None — documentation-only change; no new behavioral capabilities._

### Modified Capabilities

- `api-response`: Document `ACTION_REQUEST` success code for WebSocket client-action delegation envelopes
- `agent-runner`: Document optional `ClientTaskPersistenceContext` third argument on `runAgent`

## Impact

- **Docs only**: `openspec/codebase/**`, `openspec/specs/api-response/spec.md`, `openspec/specs/agent-runner/spec.md`
- **No runtime code changes**
