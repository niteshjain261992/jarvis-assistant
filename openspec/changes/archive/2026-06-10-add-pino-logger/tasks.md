# Tasks

Source files in scope (closed-world): `package.json`, `src/config/env.ts`, `src/server.ts`, `src/middlewares/error.middleware.ts`, `.env.example`, plus new files listed below.

## 1. Dependencies & Configuration

- [x] 1.1 Install `pino` (dependency) and `pino-pretty` (devDependency)
- [x] 1.2 Extend zod schema in `src/config/env.ts` with `LOG_LEVEL` (`z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')`)
- [x] 1.3 Document `LOG_LEVEL` in `.env.example`
- [x] 1.4 Mark the `console.error` env validation report in `src/config/env.ts` with a comment documenting it as the single allowed `console` exception (bootstrap ordering)

## 2. Logger Module

- [x] 2.1 Create `src/utils/logger.ts` — export shared pino `logger`: `level` from `env.LOG_LEVEL`; `transport: { target: 'pino-pretty' }` when not production, raw JSON to stdout in production

## 3. Replace console calls

- [x] 3.1 `src/server.ts` — listen callback and shutdown messages → `logger.info`; server-close error → `logger.error`; unhandled rejection → `logger.error`; uncaught exception → `logger.fatal`
- [x] 3.2 `src/middlewares/error.middleware.ts` — unexpected error → `logger.error({ err }, 'Unexpected error')`

## 4. Verification

- [x] 4.1 `npm run build` and `npm run lint` pass
- [x] 4.2 Grep confirms no `console.` usage in `src/` outside the documented `env.ts` exception
- [x] 4.3 Live test: `npm run dev` shows pretty logs; `LOG_LEVEL=error npm run dev` suppresses the startup info line; SIGINT logs graceful shutdown

## 5. Spec Plane Updates

- [x] 5.1 Update `openspec/codebase/map.md` (new `src/utils/logger.ts` row) and `openspec/engineering/config.md` (current variables list)
- [x] 5.2 Create `openspec/codebase/interfaces/logger.md`; update `interfaces/config.md` (new `LOG_LEVEL` field)
