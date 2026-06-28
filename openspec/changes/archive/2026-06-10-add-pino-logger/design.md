# Design

## Context

All logging today is bare `console.*`: server lifecycle in `src/server.ts`, unexpected errors in `src/middlewares/error.middleware.ts`, and env validation failures in `src/config/env.ts`. Engineering law applies: env access only via `env` (`engineering/config.md`), services free of Express types, lifecycle handling only in `server.ts`. The logger is a shared utility, so it lives in `src/utils/` alongside `app-error.ts`.

## Goals / Non-Goals

**Goals:**

- One shared pino logger instance used by all application code
- `LOG_LEVEL` env var controls verbosity; structured JSON in production, human-readable in development
- Zero remaining `console.*` calls except the documented bootstrap exception

**Non-Goals:**

- HTTP request/response logging middleware (`pino-http`) — separate future change
- Log shipping/aggregation, rotation, or redaction rules
- Child loggers per module/request correlation IDs

## Decisions

### 1. pino over winston/console

pino is the fastest mainstream Node logger, JSON-first, and the de facto standard for Express services. winston is heavier and slower; staying on console gives no levels or structure.

### 2. Logger location: `src/utils/logger.ts`

It is a shared helper with no business logic, matching the existing `utils/` precedent (`app-error.ts`). It imports `env` from `src/config/env.ts` for `LOG_LEVEL` and `isProduction` — config law forbids direct `process.env` reads.

### 3. `LOG_LEVEL` env var

Added to the zod schema as `z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')`, documented in `.env.example`, per the `engineering/config.md` procedure.

### 4. Dev pretty-printing via `pino-pretty` transport

When not in production, the logger uses `transport: { target: 'pino-pretty' }`; in production it emits raw JSON to stdout. `pino-pretty` is a devDependency; production never loads it. Risk: `npm start` with a production build but `NODE_ENV=development` would try to load a missing devDependency — acceptable, as that is a misconfiguration.

### 5. Bootstrap exception in `src/config/env.ts`

The env validation failure report keeps `console.error`. The logger's configuration depends on validated env (`LOG_LEVEL`, `isProduction`), so using it from inside env validation would create a circular dependency. This is the single allowed `console` usage, marked with a comment.

### 6. Replacement mapping

- `server.ts` listen callback → `logger.info`
- `server.ts` shutdown messages → `logger.info`, close error → `logger.error`
- `server.ts` unhandled rejection → `logger.error`, uncaught exception → `logger.fatal`
- `error.middleware.ts` unexpected error → `logger.error({ err }, 'Unexpected error')` (pino serializes the error object)

## Risks / Trade-offs

- [pino JSON output is unreadable in raw form] → pino-pretty in dev; production logs are meant for machines
- [Logger import order: importing `logger` pulls in `env` validation] → already the established pattern; `env.ts` exits the process on invalid config before any logging is needed
- [`console.error` remains in `env.ts`] → documented exception; output still reaches stderr where startup failures belong
