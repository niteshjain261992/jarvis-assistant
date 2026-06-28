# unit-testing Delta Specification

## ADDED Requirements

### Requirement: Jest test suite

The repository SHALL provide an automated test suite runnable via `npm test`, executing Jest against TypeScript test files in `tests/` (ESM mode). The suite SHALL exercise the application through its public surfaces: exported functions/classes and HTTP endpoints via the side-effect-free `createApp()`.

#### Scenario: Test suite runs

- **WHEN** a developer runs `npm test` on a clean checkout with dependencies installed
- **THEN** Jest discovers and runs all test files in `tests/` and exits 0 when all tests pass

#### Scenario: HTTP behavior tested without a live server

- **WHEN** the suite tests an HTTP endpoint
- **THEN** it imports `createApp()` and asserts via supertest, without binding a network port or contacting external services

### Requirement: Coverage gate of 90 percent

The test run SHALL collect coverage from all source files under `src/` (excluding the `src/server.ts` entry point) and SHALL fail when global statements, branches, functions, or lines coverage is below 90%.

#### Scenario: Coverage below threshold fails

- **WHEN** `npm test` runs and any global coverage metric is below 90%
- **THEN** the test command exits non-zero even if all individual tests pass

#### Scenario: Coverage at or above threshold passes

- **WHEN** `npm test` runs with all tests green and every global coverage metric at 90% or above
- **THEN** the test command exits 0

### Requirement: New features ship with unit tests

Every change that adds or modifies application behavior SHALL include Jest unit tests covering the new or changed behavior, such that `npm test` (including the coverage gate) passes when the change is complete.

#### Scenario: Feature change includes tests

- **WHEN** a change introduces a new capability or modifies existing behavior
- **THEN** the change's tasks include writing/updating tests, and `npm test` passes before the change is considered done
