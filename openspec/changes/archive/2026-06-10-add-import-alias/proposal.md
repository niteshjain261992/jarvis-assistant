# Proposal: add-import-alias

## Why

All internal imports are relative (`../utils/api-response.js`, `../../src/config/env.js` in tests), which gets noisier as nesting grows and makes moving files churn-heavy. A root alias (`@/utils/api-response.js`) makes imports location-independent and uniform.

## What Changes

- Add `"@/*": ["src/*"]` path mapping to `tsconfig.json` (with `baseUrl`)
- Make the alias work in every runtime, not just the type checker:
  - dev: `tsx` resolves tsconfig paths natively
  - production build: add `tsc-alias` to rewrite `@/` to relative paths in `dist/` (tsc alone does not rewrite aliases); `build` becomes `tsc && tsc-alias`
  - tests: extend Jest `moduleNameMapper` with the `@/` mapping
- Migrate all internal imports in `src/` and `tests/` (including `jest.mock`/`require` paths) from relative to `@/...` form
- Record the convention in `openspec/engineering/stack.md`

## Capabilities

### New Capabilities

- `import-aliases`: the `@/*` module alias contract — mapping definition and the requirement that it resolves identically across dev, build, and test runtimes

### Modified Capabilities

(none — no runtime behavior changes; this is repository tooling like `unit-testing`)

## Impact

- **Dependencies (dev-only)**: `tsc-alias`
- **Code**: `tsconfig.json`, `package.json` (build script), `jest.config.js`; import-statement updates across all 11 `src/` files and all 8 `tests/` files (no logic changes)
- **Spec plane**: new `openspec/specs/import-aliases/spec.md`; updates to `openspec/engineering/stack.md` and `openspec/codebase/map.md`
- **Risk**: production resolution depends on `tsc-alias` rewriting — verified by an `npm start` smoke test
