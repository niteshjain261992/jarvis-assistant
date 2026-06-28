# Design

## Context

Empty repository (spec plane only, no `src/`). This change lays the foundation every future Jarvis backend change builds on, so tooling and architectural conventions chosen here become repo law (they will seed `openspec/engineering/`).

## Goals / Non-Goals

**Goals:**

- Modern ESM-native Node.js + TypeScript setup with strict compiler settings
- Layered architecture with clear separation of concerns
- Production-grade error handling, security defaults, and lifecycle management
- A scaffold where `app.ts` is importable for future integration tests (supertest) without side effects

**Non-Goals:**

- Database/persistence, authentication, structured logging library (pino), request validation middleware, tests, CI/CD, Docker — each is a future change

## Decisions

### 1. ESM + NodeNext (over CommonJS)

`"type": "module"` in package.json; `module` and `moduleResolution` set to `NodeNext`. Relative imports use explicit `.js` extensions (NodeNext requirement). CommonJS rejected: legacy interop mode, worse alignment with the modern ecosystem.

### 2. tsx for development (over ts-node)

`tsx watch src/server.ts` for dev. tsx is esbuild-based, ESM-native, zero-config. ts-node rejected: slower, fragile ESM support requiring loader flags.

### 3. Strict TypeScript

`strict: true`, `noUnusedLocals`, `noUnusedParameters` (per requirements), plus `noUncheckedIndexedAccess` and `forceConsistentCasingInFileNames`. No `any` anywhere; error middleware uses `unknown` + narrowing.

### 4. Environment validation with zod (over hand-rolled parsing)

`src/config/env.ts` loads dotenv once, parses `process.env` against a zod schema, and exports a frozen typed `env` object. Invalid/missing vars crash the process at startup with a readable report. Hand-rolled parsing rejected: no type inference, easy to drift.

### 5. Layered architecture

```
src/
  config/        # env validation, app constants
  controllers/   # req/res handling only — no business logic
  services/      # business logic — no Express types allowed
  routes/        # route definitions wiring controllers
  middlewares/   # error handler; future auth/validation
  utils/         # AppError, shared helpers
  app.ts         # express instance: helmet, cors, json, routes, 404, error mw
  server.ts      # entry point: listen + lifecycle; only file with import side effects
```

`controllers/`, `services/`, `routes/` are created with the health-check flow as the first example of the pattern (health route → controller). The app/server split keeps `app.ts` pure for testing.

### 6. Error handling model

- `AppError extends Error` with `statusCode: number` and `isOperational: boolean`; captures stack via `Error.captureStackTrace`.
- 404 middleware converts unmatched routes into `AppError(404)`.
- Global error middleware (4-arity, registered last): operational errors → `{ status, message }` JSON with their status code; unknown/programmer errors → log full error, respond generic 500. Stack traces included in response only when `NODE_ENV !== "production"`.

### 7. Process lifecycle

In `server.ts`:

- `SIGTERM`/`SIGINT` → stop accepting connections (`server.close()`), then exit 0
- `unhandledRejection` → log reason, throw to escalate into `uncaughtException`
- `uncaughtException` → log, exit 1 immediately (process state untrustworthy)

## Risks / Trade-offs

- [zod adds a runtime dependency for config only] → Acceptable; it will also serve future request validation, so the dependency is amortized
- [Strict flags (`noUncheckedIndexedAccess`) can feel noisy early] → Cheaper to enforce from commit one than retrofit
- [No logging library yet — console only] → Fine for scaffold; pino lands in a dedicated change and replaces call sites in one sweep
- [ESM `.js` import extensions surprise contributors] → Documented in `openspec/engineering/stack.md` when seeded
