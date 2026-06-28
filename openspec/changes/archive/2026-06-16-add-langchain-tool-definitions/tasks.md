## 1. Refactor tool files to local metadata

- [x] 1.1 Refactor `open-camera.tool.ts` — define local `commandName`, `phrases`, `executor`, `payload`; remove `getCommandCatalogEntry` import; export metadata constants for tests if helpful
- [x] 1.2 Refactor `off-lights.tool.ts` — same local-metadata pattern
- [x] 1.3 Refactor `play-music.tool.ts` — same local-metadata pattern

## 2. Move tests to tests/

- [x] 2.1 Create `tests/agent/tools/registry.test.ts` — move from `src/agent/tools/registry.test.ts`; import via `@/agent/tools/index.js`; remove catalog-alignment tests
- [x] 2.2 Create `tests/agent/tools/open-camera.tool.test.ts` — assert handler shape and local phrase coverage
- [x] 2.3 Create `tests/agent/tools/off-lights.tool.test.ts` — same pattern
- [x] 2.4 Create `tests/agent/tools/play-music.tool.test.ts` — same pattern
- [x] 2.5 Delete colocated `src/agent/tools/*.test.ts` files

## 3. Jest configuration

- [x] 3.1 Revert `jest.config.js` `roots` to `['<rootDir>/tests']` only

## 4. Verification

- [x] 4.1 Run `npm test` — all tests pass, coverage gate met

## Out of scope (do not do)

- Do not modify `command-catalog.ts`, `message.service.ts`, or `ollama.service.ts`
- Do not add catalog imports back to tool files
- Do not wire tools into any agent graph
