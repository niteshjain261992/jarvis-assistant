# Interface: logger (`src/utils/logger.ts`)

## Exports

```ts
export const logger: pino.Logger;
```

## Guarantees

- Single shared instance; all application logging goes through it (no `console.*` — sole exception: env validation failure report in `src/config/env.ts`, which runs before the logger can be configured).
- `level` comes from `env.LOG_LEVEL` (default `info`); entries below the level are dropped.
- Output: human-readable pretty format outside production (`pino-pretty` transport, devDependency), single-line JSON to stdout in production.
- Errors are logged as `logger.error({ err }, 'message')` so pino serializes stack/cause.
- Message pipeline observability uses `logger.debug` with structured fields (`conversationId`, `intent`, `llmOperation`, `durationMs`, `summaryJob`, etc.). Set `LOG_LEVEL=debug` locally to trace `POST /messages` end-to-end; default `info` suppresses pipeline debug noise.

## Error modes

- Importing this module triggers env validation (it imports `src/config/env.ts`); invalid env exits the process before the logger exists.
- Running a production build with `NODE_ENV !== 'production'` requires `pino-pretty` to be installed (devDependency).
