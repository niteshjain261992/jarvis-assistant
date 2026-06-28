# import-aliases Specification

## Purpose

Provide a root module alias (`@/*` → `src/*`) so internal imports are location-independent and uniform across the codebase, with identical resolution in every execution context (type checking, dev server, production build, and tests).

## Requirements

### Requirement: Root module alias

The repository SHALL define the module alias `@/*` mapping to `src/*` in `tsconfig.json` (`baseUrl` + `paths`), and all internal imports in `src/` and `tests/` SHALL use the alias form with explicit `.js` extensions (e.g. `import { logger } from '@/utils/logger.js'`) instead of relative paths.

#### Scenario: Internal import uses the alias

- **WHEN** a source or test file imports another module from `src/`
- **THEN** the import specifier starts with `@/` and ends with `.js`

### Requirement: Alias resolves in every runtime

The `@/*` alias SHALL resolve correctly in all four execution contexts: type checking (`tsc`), the dev server (`tsx`), the production build output (`node dist/server.js`, via build-time rewriting), and the Jest test runner (via `moduleNameMapper`).

#### Scenario: Production build runs

- **WHEN** the project is built with `npm run build` and started with `npm start`
- **THEN** the server boots and serves requests with no module-resolution errors

#### Scenario: Tests resolve the alias

- **WHEN** `npm test` runs with imports and `jest.mock` paths in `@/...` form
- **THEN** all modules and mocks resolve and the suite passes
