# Design

## Context

ESM-only project (`"type": "module"`, NodeNext, explicit `.js` import extensions) with zero tests. `src/app.ts` is deliberately side-effect-free so it can be imported by tests (engineering law in `stack.md`); `src/server.ts` is the only file with import side effects. The user mandates Jest specifically, with a >90% coverage gate as a standing constraint for all future features.

## Goals / Non-Goals

**Goals:**

- `npm test` runs Jest with coverage and fails below 90% on any global metric
- Full test coverage of existing code so the gate passes from day one
- A binding engineering convention so every future change must ship tests

**Non-Goals:**

- E2E tests against a live Ollama (network is mocked)
- CI pipeline setup (separate change)
- Mutation testing, snapshot testing conventions

## Decisions

### 1. Jest + ts-jest in transpile-only CJS mode (revised during implementation)

Originally planned as ts-jest ESM mode (`--experimental-vm-modules`), but that breaks `jest.mock`/`jest.resetModules` — which the env, logger, and middleware tests depend on — and a `jest.config.ts` would drag in a `ts-node` dependency. Instead: `jest.config.js` (ESM file, supported natively) with ts-jest transpiling tests to CJS (`isolatedModules`, `diagnostics: false`). `moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' }` maps the mandatory `.js` import extensions back to TS sources. Type-checking of tests is handled by the editor via `tests/tsconfig.json`; lint covers `tests/`. (vitest would avoid this friction but Jest is an explicit user requirement.)

### 2. Tests live in `tests/`, mirroring `src/`

Co-locating `*.test.ts` under `src/` would make `tsc` compile tests into `dist/`. A top-level `tests/` directory keeps the build clean without touching `tsconfig.json` (`include: ["src"]`). The lint script widens from `eslint src` to `eslint src tests`. A `tests/tsconfig.json` extending the root config gives editors type info with jest globals (`types: ["jest"]`).

### 3. Coverage gate: global 90% across all four metrics

`coverageThreshold: { global: { statements: 90, branches: 90, functions: 90, lines: 90 } }` and `collectCoverageFrom: ['src/**/*.ts']` with two exclusions:

- `src/server.ts` — entry point: process signal handlers and `app.listen` lifecycle; not meaningfully unit-testable, and `stack.md` already isolates all side effects there
- coverage runs on everything else, including `env.ts` and `logger.ts`

`npm test` always runs with `--coverage` so the gate cannot be skipped accidentally.

### 4. Test strategy per module

- `AppError` — direct construction assertions
- `env.ts` — defaults applied; invalid env path tested with `jest.isolateModules` + mocked `process.exit`/`console.error`
- `logger.ts` — instance exists with level from env (transport not asserted; format is pino's concern)
- `error.middleware.ts` — unit-call handlers with stubbed `res`; operational vs unknown error branches, production vs dev stack behavior
- HTTP (`app.ts`, routes, controllers) — `supertest` against `createApp()`: `GET /health` 200, unknown route 404, `POST /command` 200/400, service failure 502
- `ollama.service.ts` — mock `global.fetch`: success + normalization (quotes/case/whitespace), non-2xx → 502, network reject → 502, empty response → 502

### 5. Tests run with `NODE_ENV=test`, `LOG_LEVEL=fatal`

Set in the test script env (or jest `setupFiles`) so pino stays quiet and `isProduction` is false. No spec change to logging: `test` is already a valid `NODE_ENV` value.

### 6. The standing constraint lives in `openspec/engineering/testing.md`

Engineering docs are binding law read during every planning phase. The doc states: every feature change MUST include Jest unit tests for new/changed behavior, `npm test` MUST pass (which enforces >= 90% coverage via the config), and tasks.md of every change MUST include a test task. This makes the constraint self-propagating through the spec-driven workflow without modifying the propose/apply skills.

## Risks / Trade-offs

- [ts-jest ESM + experimental VM modules is fiddly] → pinned, well-documented setup; verified by running the suite in this change
- [90% global gate can block urgent fixes] → threshold lives in one place (`jest.config.ts`); lowering it requires an explicit, visible diff
- [Excluding `server.ts` slightly inflates the metric] → documented here and in `testing.md`; lifecycle code is covered by the http-server spec's manual scenarios
