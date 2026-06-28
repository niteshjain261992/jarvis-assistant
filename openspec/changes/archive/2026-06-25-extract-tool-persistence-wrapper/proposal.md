## Why

The client-task broker currently owns both WebSocket delegation and database persistence for client tools, while server-side tools (such as the upcoming `web_search`) have no action-row lifecycle at all. Separating persistence into a shared wrapper lets every tool—client or server—follow the same insert-pending → execute → update-completed/failed pattern without duplicating logic or coupling the broker to the message repository.

## What Changes

- Add `withToolPersistence` in `src/agent/tools/tool-persistence.ts` — shared insert-pending / execute / update-completed-or-failed lifecycle for all tools
- Move `ClientTaskPersistenceContext` from `client-task-broker.ts` to `tool-persistence.ts` (re-export chain unchanged for consumers)
- Strip persistence from `client-task-broker.ts` — broker handles WebSocket delegation only
- **BREAKING**: `requestFromClient` drops the optional `context` parameter; callers wrap with `withToolPersistence` instead
- Update client tools (`open-camera`, `off-lights`, `play-music`) to call `withToolPersistence` around `requestFromClient`
- Re-export `withToolPersistence` from `src/agent/tools/index.ts`
- Add unit tests for `tool-persistence.ts`; update broker and tool tests to reflect the split

## Capabilities

### New Capabilities

- `tool-persistence`: Shared action-row lifecycle wrapper (`withToolPersistence`) for client and server tool execution

### Modified Capabilities

- `agent-tools`: Persistence moves from broker to `withToolPersistence`; client tools wrap delegation; new persistence scenarios
- `client-task-broker`: Remove persistence requirements; `requestFromClient` no longer accepts context or writes message rows

## Impact

- **Source**: `src/agent/tools/tool-persistence.ts` (new), `client-task-broker.ts`, `open-camera.tool.ts`, `off-lights.tool.ts`, `play-music/index.ts`, `types.ts`, `index.ts`
- **Tests**: New `tests/agent/tools/tool-persistence.test.ts`; updates to `open-camera`, `off-lights`, `play-music`, and `client-task-broker` tests
- **Downstream**: `add-tavily-web-search-tool` change will consume `withToolPersistence` for server-side persistence (not implemented here)
- **API**: Public `ClientTaskPersistenceContext` type location changes internally; barrel export path unchanged
