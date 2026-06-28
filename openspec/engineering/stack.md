# Stack

Binding conventions for all code in this repo.

## Runtime & Language

- Node.js >= 20, TypeScript, Express 5
- **ESM only**: `"type": "module"` in package.json. No CommonJS (`require`, `module.exports`).
- **NodeNext resolution**: imports MUST use explicit `.js` extensions.
- **Import alias**: all internal imports (in `src/` and `tests/`) MUST use the `@/` alias (e.g., `import { env } from '@/config/env.js'`), never relative paths. Defined in `tsconfig.json` `paths`; resolved by tsx (dev), `tsc-alias` (build), and Jest `moduleNameMapper` (tests).

## TypeScript

- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `forceConsistentCasingInFileNames` — never weaken these.
- `any` is forbidden (ESLint enforces `@typescript-eslint/no-explicit-any: error`). Use `unknown` + narrowing.
- Unused-but-required parameters (e.g., Express 4-arity error handlers) are prefixed with `_`.

## Tooling

- **Dev**: `npm run dev` → `tsx watch src/server.ts` (tsx, never ts-node)
- **Build**: `npm run build` → `tsc` to `dist/`
- **Run**: `npm start` → `node dist/server.js`
- **Lint/Format**: ESLint (flat config, typescript-eslint) + Prettier
- **Test**: `npm test` → Jest (+ts-jest, supertest) with a 90% global coverage gate — see `engineering/testing.md`

## Architecture: layered, separation of concerns

```
src/
  config/        # env validation, app constants
  controllers/   # req/res handling only — no business logic
  services/      # business logic — Express types forbidden here
  routes/        # route definitions wiring controllers
  middlewares/   # cross-cutting request middleware
  utils/         # shared helpers (AppError, etc.)
  app.ts         # express wiring; MUST stay side-effect-free on import
  server.ts      # entry point; the ONLY file with import side effects
```

Rules:

- Controllers never contain business logic; services never import Express types.
- `app.ts` must remain importable by tests (no listening, no process handlers).
- New routes are mounted in `app.ts` before the 404 handler.

## Security

- `helmet()` and `cors()` are applied globally in `app.ts` and must not be removed.

## Process lifecycle

- All lifecycle handling (`SIGTERM`, `SIGINT`, `unhandledRejection`, `uncaughtException`) lives in `server.ts` only.
- `unhandledRejection` escalates by rethrowing; `uncaughtException` logs and exits 1.
