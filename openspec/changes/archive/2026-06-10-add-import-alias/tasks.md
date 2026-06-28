# Tasks

Source files in scope (closed-world): `tsconfig.json`, `package.json`, `jest.config.js`, all 11 files in `src/`, all 8 test files in `tests/`. No logic changes — configuration and import specifiers only.

## 1. Alias Configuration

- [x] 1.1 Add `"paths": { "@/*": ["./src/*"] }` to `tsconfig.json` (no `baseUrl` — deprecated in TS 6, see design decision 1)
- [x] 1.2 Install `tsc-alias` (devDependency); change `build` script to `tsc && tsc-alias`
- [x] 1.3 Add `'^@/(.*)\\.js$': '<rootDir>/src/$1'` to `jest.config.js` `moduleNameMapper` (before the relative mapping)

## 2. Import Migration

- [x] 2.1 Migrate all relative imports in `src/**/*.ts` (21 statements, 11 files) to `@/...` form, keeping `.js` extensions
- [x] 2.2 Migrate all `src` references in `tests/**/*.ts` — import statements, `require(...)` calls inside `jest.isolateModules`/resetModules tests, and `jest.mock(...)` paths — to `@/...` form

## 3. Verification

- [x] 3.1 `npm test` passes (all suites, coverage gate >= 90%)
- [x] 3.2 `npm run build` and `npm run lint` pass; grep confirms no `../`-style internal imports remain in `src/` or `tests/`
- [x] 3.3 Smoke tests: `npm run dev` boots and serves `GET /health`; `npm start` (built `dist/`) boots and serves `GET /health` with no resolution errors

## 4. Spec Plane Updates

- [x] 4.1 Update `openspec/engineering/stack.md` (import convention: internal imports use `@/` alias + `.js` extension) and `openspec/codebase/map.md` (`tsconfig.json` row mentions the alias; `jest.config.js` row mentions the mapping)
