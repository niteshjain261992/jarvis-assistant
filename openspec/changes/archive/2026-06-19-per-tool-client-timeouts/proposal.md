## Why

Client-executor tools delegate work to the connected client over WebSocket, but every action currently shares a single 10-second timeout (`CLIENT_TASK_TIMEOUT_MS`). Some operations (e.g. opening a camera or waiting for hardware) need longer windows, while lightweight actions (e.g. toggling lights) can fail fast with a shorter timeout. A one-size-fits-all timeout causes false failures for slow tools and unnecessary wait time for fast ones.

## What Changes

- Add a per-tool `clientTimeoutMs` field to each tool's local `*Metadata` export
- Extend `requestFromClient` to accept an optional timeout override (defaulting to a shared fallback constant)
- Each client-executor tool factory passes its metadata timeout when calling `requestFromClient`
- Timeout error messages and persisted `errorDetails` reflect the actual timeout used for that request
- Update unit tests to cover per-tool timeout behavior and the default fallback

## Capabilities

### New Capabilities

<!-- None — this change extends existing broker and tool behavior -->

### Modified Capabilities

- `client-task-broker`: Replace the single global timeout requirement with per-request timeout resolution (tool-specific override with a default fallback)
- `agent-tools`: Require each client-executor tool metadata to declare `clientTimeoutMs` and pass it through to `requestFromClient`

## Impact

- `src/websocket/client-task-broker.ts` — signature and timeout logic
- `src/agent/tools/*.tool.ts` — metadata and `requestFromClient` calls for client-executor tools
- `src/agent/tools/types.ts` — optional shared type for timeout metadata if needed
- `tests/websocket/client-task-broker.test.ts` — timeout tests with custom durations
- `tests/agent/tools/*.tool.test.ts` — verify timeout is forwarded to broker
- `openspec/specs/client-task-broker/spec.md` and `openspec/specs/agent-tools/spec.md` — requirement updates via delta specs
