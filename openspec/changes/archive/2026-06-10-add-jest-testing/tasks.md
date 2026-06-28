# Tasks

Source files in scope (closed-world): `package.json`, `eslint.config.js`, plus new files listed below. No `src/` runtime files change.

## 1. Test Infrastructure

- [x] 1.1 Install devDependencies: `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`
- [x] 1.2 Create `jest.config.js` — ts-jest transpile-only CJS transform (see design decision 1), `moduleNameMapper` for `.js` extensions, `roots: ['tests']`, `collectCoverageFrom: ['src/**/*.ts', '!src/server.ts']`, `coverageThreshold` global 90 on all four metrics
- [x] 1.3 Add `test` script to `package.json`: `NODE_ENV=test LOG_LEVEL=fatal jest --coverage`
- [x] 1.4 Create `tests/tsconfig.json` extending root config with jest types; widen lint script to `eslint src tests`

## 2. Unit Tests

- [x] 2.1 `tests/utils/app-error.test.ts` — statusCode, isOperational default/override, name, stack capture
- [x] 2.2 `tests/config/env.test.ts` — defaults applied; invalid env exits with report (`jest.isolateModules`, mocked `process.exit` + `console.error`)
- [x] 2.3 `tests/utils/logger.test.ts` — shared instance exists, level matches `env.LOG_LEVEL`
- [x] 2.4 `tests/middlewares/error.middleware.test.ts` — notFoundHandler 404 AppError; globalErrorHandler operational response, unknown error → 500 + logger.error, stack only outside production
- [x] 2.5 `tests/services/ollama.service.test.ts` — mocked `global.fetch`: success + normalization (quotes, case, whitespace), non-2xx → AppError 502, network failure → 502, empty response → 502

## 3. HTTP Integration Tests

- [x] 3.1 `tests/app.test.ts` — supertest against `createApp()`: `GET /health` 200 `{ status: "ok" }`, unknown route 404, helmet header present, invalid JSON body handled
- [x] 3.2 `tests/controllers/command.controller.test.ts` — `POST /command` (service mocked): valid prompt 200 `{ command, model }`, empty/missing/oversized prompt 400, service AppError propagates as 502

## 4. Verification

- [x] 4.1 `npm test` passes with all global coverage metrics >= 90%
- [x] 4.2 `npm run build` and `npm run lint` pass (tests excluded from `dist/`, lint covers `tests/`)

## 5. Engineering Convention & Spec Plane

- [x] 5.1 Create `openspec/engineering/testing.md` — binding law: every feature change ships Jest unit tests; `npm test` (with 90% coverage gate) must pass before a change is complete; every change's tasks.md includes a test task; `src/server.ts` exclusion documented
- [x] 5.2 Update `openspec/engineering/stack.md` (tooling: test runner) and `openspec/codebase/map.md` (`jest.config.ts`, `tests/` rows)
