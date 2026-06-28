# Proposal: add-jest-testing

## Why

The project has no automated tests: regressions in the error pipeline, env validation, or command interpretation can only be caught by manual `curl` checks. The user also wants a standing constraint: every future feature must ship with unit tests, and coverage must stay above 90%.

## What Changes

- Add Jest (with ts-jest for ESM TypeScript) as the test runner, wired to `npm test`
- Enforce a global coverage threshold of 90% (statements, branches, functions, lines) in the Jest config — the test run fails below it
- Write unit/integration tests for all existing code: `AppError`, env config, logger, error middleware, health endpoint, command endpoint, and the Ollama service (with mocked `fetch`)
- Add `supertest` for HTTP-level tests against the side-effect-free `createApp()`
- Record the standing constraint in a new `openspec/engineering/testing.md`: new features MUST include Jest unit tests and keep coverage >= 90%
- Update `openspec/engineering/stack.md` tooling section accordingly

## Capabilities

### New Capabilities

- `unit-testing`: automated test suite — Jest runner, 90% coverage gate, and the rule that every feature change ships with unit tests

### Modified Capabilities

(none — no existing spec-level behavior changes)

## Impact

- **Dependencies (dev-only)**: `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`
- **Code**: new `jest.config.ts`, new `tests/**/*.test.ts` files; `package.json` scripts; lint script widened to cover `tests/`
- **Spec plane**: new `openspec/specs/unit-testing/spec.md`, new `openspec/engineering/testing.md`, updates to `openspec/engineering/stack.md` and `openspec/codebase/map.md`
- **Behavior**: no runtime behavior changes; CI/dev workflow gains a failing gate when coverage drops below 90%
