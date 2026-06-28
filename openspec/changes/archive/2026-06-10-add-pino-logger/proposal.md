# Proposal: add-pino-logger

## Why

All runtime output currently goes through bare `console.log`/`console.error` calls scattered across `src/server.ts`, `src/middlewares/error.middleware.ts`, and `src/config/env.ts`. There is no log level control, no structured (JSON) output for production log aggregation, and no consistent format. A dedicated logger fixes this before more capabilities land.

## What Changes

- Add `pino` as the application logger, exposed as a shared `logger` instance in `src/utils/logger.ts`
- Add a `LOG_LEVEL` environment variable (validated by zod, default `info`) controlling verbosity
- Pretty-printed logs in development (via `pino-pretty`), structured JSON logs in production
- Replace every `console.*` call with the logger:
  - `src/server.ts`: startup, shutdown, unhandled rejection, uncaught exception
  - `src/middlewares/error.middleware.ts`: unexpected-error logging
- Exception: the env validation failure report in `src/config/env.ts` keeps `console.error`, because the logger's configuration depends on a successfully validated env (bootstrap ordering). This is documented as the single allowed exception.

## Capabilities

### New Capabilities

- `logging`: structured application logging — shared pino logger, level configuration via env, dev/prod output formats, and the rule that application code logs through it instead of `console`

### Modified Capabilities

- `app-config`: the env schema gains a `LOG_LEVEL` variable (enum of pino levels, default `info`)

## Impact

- **Dependencies**: add `pino` (runtime), `pino-pretty` (dev-only)
- **Code**: new `src/utils/logger.ts`; edits to `src/server.ts`, `src/middlewares/error.middleware.ts`, `src/config/env.ts` (schema only), `.env.example`, `package.json`
- **Spec plane**: new `openspec/specs/logging/spec.md`; updates to `openspec/codebase/map.md`, `openspec/engineering/config.md`, `openspec/codebase/interfaces/config.md`, and a new `openspec/codebase/interfaces/logger.md`
- **Behavior**: log output format changes (JSON in production); no HTTP API changes
