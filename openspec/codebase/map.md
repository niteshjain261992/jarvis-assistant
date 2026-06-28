# Codebase Map

As-is topography. If this disagrees with code, this file is the bug — fix it in the same commit.

## Root

| Path | Purpose |
|---|---|
| `package.json` | ESM project; scripts: `dev` (tsx watch), `build` (tsc), `start`, `lint`, `format` |
| `tsconfig.json` | NodeNext + strict flags; `src/` → `dist/`; `@/*` alias → `src/*` (build rewrite via `tsc-alias`) |
| `eslint.config.js` | Flat config: js + typescript-eslint recommended; no-explicit-any; `_`-prefixed unused args allowed |
| `jest.config.js` | Jest + ts-jest (transpile-only CJS); coverage gate 90% global; excludes `src/server.ts`; maps `@/` and `.js` imports |
| `tests/` | Jest tests mirroring `src/` (+ `tests/tsconfig.json` for editor types); run via `npm test` |
| `.prettierrc` | Formatting rules |
| `.env.example` | Committed env contract (`NODE_ENV`, `PORT`, `OLLAMA_*`, `LOG_LEVEL`, `MONGODB_*`) |
| `.gitignore` | Ignores `node_modules/`, `dist/`, `.env*` (except `.env.example`) |

## src/

| Path | Purpose | Interface doc |
|---|---|---|
| `src/config/env.ts` | dotenv load + zod validation; exports frozen `env`, `isProduction` | `interfaces/config.md` |
| `src/config/mongodb.ts` | Mongoose singleton connect/disconnect (`connectMongo`/`disconnectMongo`) | `interfaces/mongodb.md` |
| `src/config/agenda.ts` | Agenda singleton start/stop (`startAgenda`/`stopAgenda`) backed by MongoDB | `interfaces/conversation.md` |
| `src/models/message.model.ts` | Mongoose schema + `MessageModel` for `messages` collection | `interfaces/message.md` |
| `src/models/conversation.model.ts` | Mongoose schema + `ConversationModel` for `conversations` collection | `interfaces/conversation.md` |
| `src/utils/app-error.ts` | `AppError` class (statusCode, code, isOperational) | `interfaces/app-error.md` |
| `src/utils/api-response.ts` | Envelope `{ code, message, data }`: code enums, `successResponse`, `SuccessResponse`/`ErrorResponse` catalogs | `interfaces/api-response.md` |
| `src/utils/logger.ts` | Shared pino `logger` (level from `env.LOG_LEVEL`; pretty in dev, JSON in prod) | `interfaces/logger.md` |
| `src/middlewares/error.middleware.ts` | `notFoundHandler`, `globalErrorHandler` | `interfaces/error-middleware.md` |
| `src/config/command-catalog.ts` | Allowed commands with executor/payload metadata lookup | `interfaces/message.md` |
| `src/services/ollama.service.ts` | `CONVERSATION_SYSTEM_PROMPT`, `filterCompletedContextMessages`, `summarizeText` | `interfaces/ollama.md` |
| `src/repositories/message.repository.ts` | `MessageModel` CRUD wrappers | `interfaces/message.md` |
| `src/repositories/conversation.repository.ts` | `ConversationModel` CRUD wrappers | `interfaces/conversation.md` |
| `src/jobs/conversation-summary.job.ts` | Registers `update-conversation-summary` Agenda handler | `interfaces/conversation.md` |
| `src/services/conversation-summary.service.ts` | Enqueue + process rolling conversation summaries | `interfaces/conversation.md` |
| `src/services/message.service.ts` | Agent-driven message pipeline: orchestrator + `runAgentTurn` + centralized error recovery | `interfaces/message.md` |
| `src/schemas/message-request.schema.ts` | Shared zod schema for `{ prompt }` (WebSocket) | `interfaces/message.md` |
| `src/utils/message-envelope.ts` | WebSocket envelope builders | `interfaces/message-envelope.md` |
| `src/websocket/client-task-broker.ts` | In-memory client-task correlation + optional message persistence | `interfaces/client-task-broker.md` |
| `src/websocket/messages.gateway.ts` | WebSocket server attachment + message handler | `interfaces/websocket.md` |
| `src/agent/agent-runner.ts` | LangGraph `runAgent` — text/action/clarify results | `interfaces/agent-runner.md` |
| `src/agent/tools/index.ts` | Public barrel for agent tools registry | `interfaces/agent-tools.md` |
| `src/agent/tools/registry.ts` | Tool metadata table, `buildToolsForConnection`, uniqueness asserts | `interfaces/agent-tools.md` |
| `src/agent/tools/types.ts` | `ToolDefinition`, `ClientToolFactory`, re-exported persistence context | `interfaces/agent-tools.md` |
| `src/agent/tools/open-camera.tool.ts` | `OPEN:CAMERA` client tool factory | `interfaces/agent-tools.md` |
| `src/agent/tools/off-lights.tool.ts` | `OFF:LIGHTS` client tool factory | `interfaces/agent-tools.md` |
| `src/agent/tools/play-music.tool.ts` | `PLAY:MUSIC` client tool factory | `interfaces/agent-tools.md` |
| `src/controllers/health.controller.ts` | `getHealth` — status/uptime/timestamp payload | `interfaces/http.md` |
| `src/routes/health.route.ts` | `healthRouter` — mounts `GET /` → `getHealth` | `interfaces/http.md` |
| `src/app.ts` | `createApp()` + `createHttpServer()` — helmet, cors, json, routes; side-effect-free | `interfaces/http.md` |
| `src/server.ts` | Entry point: Mongo connect, HTTP+WebSocket listen on `env.PORT`; graceful shutdown | `interfaces/http.md` |

## HTTP surface

All responses use the envelope `{ code, message, data }` (see `interfaces/api-response.md`).

| Method | Path | Handler | Response |
|---|---|---|---|
| GET | `/health` | `getHealth` | 200 `HEALTH_OK`, `data: { status: "ok", uptime, timestamp }` |
| WS | `/` (upgrade on same port) | `handleRawMessage` | JSON envelope: `MESSAGE_COMPLETED` / `MESSAGE_FAILED` / `BAD_REQUEST` / `LLM_*` |
| * | (unmatched) | `notFoundHandler` → `globalErrorHandler` | 404 `NOT_FOUND`, `data: {}` |

## External dependencies

- **Ollama** at `env.OLLAMA_BASE_URL` (default `http://localhost:11434`), model `env.OLLAMA_MODEL` (default `llama3.1:8b`) — agent turns via LangChain `ChatOllama` in `agent-runner.ts`, and rolling conversation summaries via direct HTTP in `ollama.service.ts`.
- **MongoDB** at `env.MONGODB_URI` (default `mongodb://127.0.0.1:27017`), database `env.MONGODB_DATABASE` (default `jarvis`) — message/conversation persistence and Agenda job store (`agendaJobs` collection).
