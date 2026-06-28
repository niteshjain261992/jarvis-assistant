# Tasks

Source files in scope (closed-world): `src/config/env.ts`, `src/app.ts`, `.env.example`, plus new files listed below.

## 1. Configuration

- [x] 1.1 Extend zod schema in `src/config/env.ts` with `OLLAMA_BASE_URL` (url, default `http://localhost:11434`) and `OLLAMA_MODEL` (non-empty string, default `llama3.1:8b`)
- [x] 1.2 Document both variables in `.env.example`

## 2. Service Layer

- [x] 2.1 Create `src/services/ollama.service.ts` — `interpretCommand(prompt: string): Promise<string>`: POST `{OLLAMA_BASE_URL}/api/generate` (model, system instruction for ACTION:TARGET-only output, `stream: false`, temperature 0, 30s `AbortSignal.timeout`); normalize output (trim, strip quotes/backticks, uppercase); throw `AppError(502)` on network failure, timeout, non-2xx, or empty output; no Express imports

## 3. HTTP Layer

- [x] 3.1 Create `src/controllers/command.controller.ts` — zod-validate body (`prompt`: trimmed non-empty string, max 500 chars; invalid → `AppError(400)`), call `interpretCommand`, respond 200 `{ command, model }`
- [x] 3.2 Create `src/routes/command.route.ts` — `commandRouter` with `POST /` → controller
- [x] 3.3 Mount `commandRouter` at `/command` in `src/app.ts` (before 404 handler)

## 4. Verification

- [x] 4.1 `npm run build` and `npm run lint` pass
- [x] 4.2 Live test: `POST /command {"prompt":"open camera"}` → 200 with `command: "OPEN:CAMERA"` (Ollama running); invalid body → 400; Ollama stopped/unreachable → 502

## 5. Spec Plane Updates

- [x] 5.1 Update `openspec/codebase/map.md` (new files + HTTP surface row) and `openspec/engineering/config.md` (current variables list)
- [x] 5.2 Create `openspec/codebase/interfaces/ollama.md`; update `interfaces/http.md` (command route/controller) and `interfaces/config.md` (new env fields)
