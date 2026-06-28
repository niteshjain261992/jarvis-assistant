# Tasks

## 1. Project Initialization

- [x] 1.1 Create `package.json` with `"type": "module"`, metadata, and scripts: `dev` (tsx watch), `build` (tsc), `start` (node dist), `lint` (eslint), `format` (prettier)
- [x] 1.2 Install production deps: `express`, `cors`, `helmet`, `zod`, `dotenv`
- [x] 1.3 Install dev deps: `typescript`, `tsx`, `@types/express`, `@types/cors`, `@types/node`, `eslint`, `@eslint/js`, `typescript-eslint`, `prettier`
- [x] 1.4 Create `tsconfig.json`: `module`/`moduleResolution` NodeNext, `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `outDir: dist`, `rootDir: src`
- [x] 1.5 Create `.gitignore` (node_modules, dist, .env), `.env.example` (NODE_ENV, PORT), `.prettierrc`, `eslint.config.js`

## 2. Configuration Layer

- [x] 2.1 Create `src/config/env.ts` — dotenv load + zod schema (`NODE_ENV` enum default `development`, `PORT` coerced int default `3000`), fail-fast validation, frozen typed export

## 3. Error Handling

- [x] 3.1 Create `src/utils/app-error.ts` — `AppError` class with `statusCode`, `isOperational`, stack capture
- [x] 3.2 Create `src/middlewares/error.middleware.ts` — `notFoundHandler` (404 → AppError) and `globalErrorHandler` (operational vs unknown, stack only outside production)

## 4. Application & Server

- [x] 4.1 Create `src/controllers/health.controller.ts` and `src/routes/health.route.ts` — `GET /health` returning `{ status: "ok", uptime }`
- [x] 4.2 Create `src/app.ts` — express instance wiring helmet, cors, json parsing, routes, 404 handler, global error handler; no side effects on import
- [x] 4.3 Create `src/server.ts` — listen on `env.PORT`, SIGTERM/SIGINT graceful close, `unhandledRejection` escalation, `uncaughtException` exit(1)

## 5. Verification

- [x] 5.1 `npm run build` passes with zero errors; `npm run lint` clean
- [x] 5.2 Dev server boots via `npm run dev`; `GET /health` returns 200 JSON; unknown route returns structured 404; invalid `PORT` env crashes at startup with readable error

## 6. Spec Plane Updates

- [x] 6.1 Seed `openspec/engineering/`: `stack.md` (ESM/NodeNext/tsx/strict TS conventions), `errors.md` (AppError + middleware law), `config.md` (env validation rules)
- [x] 6.2 Create `openspec/codebase/map.md` covering every new source file, and `openspec/codebase/interfaces/` contracts for `env`, `app-error`, `app`, `server`
