## Why

The initial `add-langchain-tool-definitions` implementation looked up `phrases`, `executor`, and `payload` from `COMMAND_CATALOG` at module load and colocated tests under `src/agent/tools/`. That couples agent tools to the catalog module and breaks the repo's Jest convention (`tests/` only). Each tool file should own its metadata locally (still mirroring catalog values today), and tests should live under `tests/agent/tools/`.

## What Changes

- Refactor each `*.tool.ts` to define `commandName`, `phrases`, `executor`, and `payload` as local constants — remove `getCommandCatalogEntry` imports from tool files
- Build LangChain descriptions from the local `phrases` array; handlers return local `commandName` / `executor` / `payload`
- Move four test files from `src/agent/tools/` to `tests/agent/tools/`
- Revert `jest.config.js` to discover tests only from `tests/` (remove `src/agent/tools` root)
- Update tests: assert against locally defined constants in each tool file (or exported metadata), not live catalog lookups

## Capabilities

### New Capabilities

None — `agent-tools` capability already introduced in this change; requirements are being corrected before archive.

### Modified Capabilities

- `agent-tools`: Tool metadata authored locally per tool file; unit tests under `tests/agent/tools/`

## Impact

- **Modified files**: `src/agent/tools/open-camera.tool.ts`, `off-lights.tool.ts`, `play-music.tool.ts`, `jest.config.js`
- **Moved files**: `src/agent/tools/*.test.ts` → `tests/agent/tools/*.test.ts`
- **Deleted files**: colocated tests under `src/agent/tools/`
- **Unchanged**: `command-catalog.ts`, `message.service.ts`, `ollama.service.ts`, registry API shape, `types.ts`, `index.ts`
