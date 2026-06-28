# Interface: http (`src/app.ts`, `src/server.ts`, health route/controller)

## src/app.ts

```ts
export function createApp(): Express;
export function createHttpServer(app: Express): Server;
```

- `createApp`: returns a fully wired Express app: helmet → cors → json parsing → `/health` router → `notFoundHandler` → `globalErrorHandler`.
- `createHttpServer`: wraps the Express app in `http.createServer(app)` for shared HTTP + WebSocket listening.
- Importing/calling has no side effects (no listening, no process handlers) — safe for supertest.

## src/server.ts

- No exports. Importing it boots the service: validates env, connects MongoDB, creates the app, attaches WebSocket, listens on `env.PORT`.
- Lifecycle guarantees:
  - `connectMongo()` before listen; `disconnectMongo()` after `server.close()`.
  - `SIGTERM`/`SIGINT` → `wss.close()`, then `server.close()`, disconnect Mongo, exit 0 (exit 1 if close errors).
  - `unhandledRejection` → logged, rethrown (escalates to `uncaughtException`).
  - `uncaughtException` → logged, exit 1.
  - Startup failure (`main().catch`) → logged, exit 1.

## WebSocket

See `interfaces/websocket.md` for message protocol over `ws://host:PORT`.

## src/routes/health.route.ts

```ts
export const healthRouter: Router; // GET / → getHealth
```

## src/controllers/health.controller.ts

```ts
export function getHealth(req: Request, res: Response): void;
```

- Responds 200 `HEALTH_OK` envelope: `data: { status: "ok", uptime: number, timestamp: string (ISO 8601) }` (via `SuccessResponse.HEALTH_OK`).

## Messages

Message submission is WebSocket-only. See `interfaces/websocket.md` and `interfaces/message.md`.
