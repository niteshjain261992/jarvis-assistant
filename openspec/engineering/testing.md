# Testing

Binding law for all testing in this repo.

## The constraint

- **Every change that adds or modifies application behavior MUST ship Jest unit tests** covering the new or changed behavior. The tasks.md of every such change MUST include a test task.
- `npm test` MUST pass before a change is considered complete. It runs Jest with coverage and **fails when any global metric (statements, branches, functions, lines) drops below 90%**.
- The threshold lives in `jest.config.js` (`coverageThreshold`). Lowering it requires an explicit, justified diff.

## Mechanics

- Test runner: Jest + ts-jest in transpile-only CJS mode (`jest.config.js`); the `.js`-extension imports of NodeNext sources are mapped back to TS via `moduleNameMapper`.
- Tests live in `tests/`, mirroring `src/` (e.g., `tests/services/ollama.service.test.ts`). They are excluded from the build (`tsconfig.json` includes only `src/`) and type-checked in the editor via `tests/tsconfig.json`.
- Tests run with `NODE_ENV=test LOG_LEVEL=fatal` (set in the `test` script).
- HTTP behavior is tested with `supertest` against the side-effect-free `createApp()` — never against a listening server.
- External services are mocked (e.g., `global.fetch` for Ollama). No test may depend on a live Ollama instance.
- Mock `src/utils/logger.ts` in tests that load it transitively, so no pino transport workers are spawned.

## Coverage exclusions

- `src/server.ts` is excluded from coverage: it is the entry point containing only process lifecycle wiring (`app.listen`, signal handlers), which is exercised by the http-server spec's live scenarios instead.
- New exclusions require justification in the change's design.md.
