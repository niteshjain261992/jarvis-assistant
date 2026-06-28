# Init Express + TypeScript Scaffold

## Why

The repo has no application code yet. We need a production-grade, scalable Express.js + TypeScript foundation that all future Jarvis backend features build on, with modern tooling and strict conventions baked in from commit one.

## What Changes

- Bootstrap a Node.js project with ES Modules (`"type": "module"`), NodeNext module resolution, and `tsx` for development watching
- Strict TypeScript configuration (`strict`, `noUnusedLocals`, `noUnusedParameters`)
- Layered architecture: `config`, `controllers`, `services`, `routes`, `middlewares`, `utils`
- Security middleware (`helmet`, `cors`) configured by default
- Centralized error handling via a custom `AppError` class and a global error-handling middleware
- Typed, validated environment configuration that fails fast on missing/invalid env vars
- Graceful shutdown: SIGTERM/SIGINT, `unhandledRejection`, `uncaughtException` handled cleanly in the server entry point
- Health-check endpoint (`GET /health`)
- npm scripts: `dev`, `build`, `start`, `lint`, `format`

## Capabilities

### New Capabilities

- `http-server`: Express application serving HTTP with security middleware, JSON parsing, health-check route, and a graceful-shutdown server entry point
- `error-handling`: centralized error pipeline — `AppError` class, 404 conversion, global error middleware distinguishing operational vs programmer errors
- `app-config`: typed, validated environment configuration loaded once at startup

### Modified Capabilities

_None — this is the first change; no existing specs._

## Impact

- **New files**: `package.json`, `tsconfig.json`, `.env.example`, `.gitignore`, `eslint.config.js`, `.prettierrc`, `src/config/env.ts`, `src/utils/app-error.ts`, `src/middlewares/error.middleware.ts`, `src/app.ts`, `src/server.ts`
- **Dependencies**: express, cors, helmet, zod, dotenv (prod); typescript, tsx, @types/express, @types/cors, @types/node, eslint, prettier (dev)
- **Spec plane**: seeds `openspec/specs/` (via archive), `openspec/engineering/` (stack, errors, config conventions), `openspec/codebase/map.md` and `openspec/codebase/interfaces/`
