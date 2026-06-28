# Design

## Context

ESM NodeNext project with four resolution contexts: `tsc` (types + build), `tsx` (dev watch), plain `node` on `dist/` (production), and Jest (ts-jest transpile + moduleNameMapper). TypeScript `paths` only affects type checking — emitted JS keeps the alias literally, which Node cannot resolve. Any alias design must solve all four contexts.

## Goals / Non-Goals

**Goals:**

- `@/utils/api-response.js` style imports working identically in dev, prod build, and tests
- All existing internal imports migrated; one consistent style

**Non-Goals:**

- Multiple aliases (`@utils/`, `@config/`, ...) — one root alias is enough
- Changing the mandatory `.js` extension convention (NodeNext still requires it; alias imports keep it: `@/utils/logger.js`)

## Decisions

### 1. `tsconfig.json` paths + per-runtime support (over Node subpath imports)

Node's native `imports` field (`#/*`) would work without a build step, but the `#` prefix deviates from the requested `@/` convention and the broader ecosystem habit. Chosen: `"paths": { "@/*": ["./src/*"] }` — without `baseUrl`, which TypeScript 6 deprecates (TS5101); since TS 4.1, `paths` resolves relative to the tsconfig on its own. Plus:

- **tsx (dev)**: resolves tsconfig `paths` out of the box — no change
- **tsc (prod)**: `tsc-alias` (devDependency) runs after `tsc` and rewrites `@/...` to correct relative paths inside `dist/`, preserving `.js` extensions; `"build": "tsc && tsc-alias"`
- **Jest**: `moduleNameMapper` gains `'^@/(.*)\\.js$': '<rootDir>/src/$1'` ahead of the existing relative-`.js` mapping (also covers `jest.mock('@/...')` paths, since Jest resolves mock paths through the same mapper)

### 2. Migration scope: every internal import, both trees

All relative imports in `src/` (21 statements across 11 files) and all `../../src/...` references in `tests/` (imports, `require(...)` calls in isolateModules tests, and `jest.mock(...)` paths) become `@/...`. Same-directory `./x.js` imports are migrated too — one rule ("internal imports use `@/`") beats a depth-based exception.

### 3. `tests/tsconfig.json` inherits the alias

`paths`/`baseUrl` resolve relative to the config file that declares them (the root tsconfig), so the extended test config picks the mapping up unchanged; editor type-checking of `@/` imports in tests works without additions.

### 4. Convention recorded in `engineering/stack.md`

The stack doc's import rule changes from "relative imports MUST use explicit `.js` extensions" to: internal imports MUST use the `@/` alias with explicit `.js` extension; relative imports are reserved for... nothing — `@/` everywhere inside the repo.

## Risks / Trade-offs

- [`tsc-alias` is an extra moving part in the build] → it's a widely-used, single-purpose tool; the `npm start` smoke test in verification catches rewrite failures
- [Alias hides physical layout] → layout is shallow (`src/<layer>/<file>`); the alias path mirrors it exactly
- [Future tooling (e.g. a bundler) must know the alias] → defined once in `tsconfig.json`, which most tools read natively
