## Context

`src/agent/tools/` was implemented with one LangChain tool per command, a registry, and tests. Tool files currently call `getCommandCatalogEntry()` to read `phrases`, `executor`, and `payload`, and tests are colocated in `src/agent/tools/` with an extra Jest root.

The user wants agent tools to be self-contained: each tool file is the source of truth for its own metadata. Catalog values should still match today (`OPEN:CAMERA` → client / `{ target: 'camera' }`, etc.) but are duplicated locally, not imported. Tests follow the existing repo layout under `tests/`.

## Goals / Non-Goals

**Goals:**

- Local constants in each `*.tool.ts`: `commandName`, `phrases`, `executor`, `payload`
- Phrase-anchored descriptions built from local `phrases`
- Handlers return local metadata as `ToolHandlerResult`
- Tests at `tests/agent/tools/` importing production code via `@/` aliases
- Jest `roots` restored to `['<rootDir>/tests']` only
- `npm test` passes with 90% coverage gate

**Non-Goals:**

- Modifying `command-catalog.ts` or syncing catalog ↔ tools automatically
- Wiring tools into message pipeline or agent graph
- Adding new tools beyond the existing three

## Decisions

### 1. Local metadata constants per tool file

**Choice:** Each tool file exports its `ToolDefinition` plus defines module-level constants for `COMMAND_NAME`, `PHRASES`, `EXECUTOR`, `PAYLOAD`.

**Rationale:** Tool files are independently readable; no runtime dependency on catalog for agent binding. Catalog remains used by Ollama path separately.

**Alternative:** Keep catalog lookup — rejected per user feedback.

### 2. Optional export of metadata for tests

**Choice:** Export named constants (e.g. `OPEN_CAMERA_PHRASES`) from each tool file, or test via handler/description assertions using inline expected values copied from the tool file's constants.

**Rationale:** Tests in `tests/` need stable assertions; exporting read-only metadata constants keeps tests DRY without importing catalog.

**Preferred:** Export a small `openCameraMetadata` object or the individual constants alongside `openCameraTool` for test use.

### 3. Test location: `tests/agent/tools/`

**Choice:** Mirror module path under `tests/` — `tests/agent/tools/registry.test.ts`, etc.

**Rationale:** Matches `unit-testing` spec and every other module in the repo.

### 4. Remove catalog-missing module-load tests

**Choice:** Delete tests that mock `getCommandCatalogEntry` returning undefined — no longer applicable.

**Rationale:** Tool files no longer import catalog.

### 5. Registry and public API unchanged

**Choice:** Keep `registry.ts`, `index.ts`, `types.ts`, and uniqueness assertion as-is.

**Rationale:** Only tool authoring and test placement change.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Tool metadata drifts from `COMMAND_CATALOG` | Tests assert expected values explicitly; document that new tools must keep catalog aligned manually until a later sync change |
| Duplication between catalog and tools | Accepted trade-off for decoupling; catalog unchanged in this pass |

## Migration Plan

1. Refactor three tool files to local constants
2. Move and update four test files to `tests/agent/tools/`
3. Revert Jest roots
4. Delete old colocated tests
5. Run `npm test`

## Open Questions

None.
