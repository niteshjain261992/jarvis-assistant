# Tasks

Source files in scope (closed-world): `src/utils/app-error.ts`, `src/controllers/health.controller.ts`, `src/controllers/command.controller.ts`, `src/middlewares/error.middleware.ts`, `src/services/ollama.service.ts`, `tests/utils/app-error.test.ts`, `tests/app.test.ts`, `tests/controllers/command.controller.test.ts`, `tests/middlewares/error.middleware.test.ts`, `tests/services/ollama.service.test.ts`, plus new files listed below.

## 1. Envelope Module & AppError

- [x] 1.1 Create `src/utils/api-response.ts` — `successCodes` enum (`HEALTH_OK`, `COMMAND_INTERPRETED`), `errorCodes` enum (`BAD_REQUEST`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`, `BAD_GATEWAY`, `ERROR`, `LLM_UNAVAILABLE`, `LLM_ERROR_RESPONSE`, `LLM_EMPTY_RESPONSE`), `defaultCodeFor(statusCode)` map, `successResponse(res, httpStatusCode, code, message, data = {})`, `SuccessResponse` catalog (named senders), `ErrorResponse` catalog (named `AppError` factories with default messages)
- [x] 1.2 Extend `src/utils/app-error.ts` — add `code` field (`errorCodes`, default via `defaultCodeFor(statusCode)`)

## 2. Adopt Envelope

- [x] 2.1 `src/controllers/health.controller.ts` — `SuccessResponse.HEALTH_OK(res, { status: 'ok', uptime, timestamp })`
- [x] 2.2 `src/controllers/command.controller.ts` — `SuccessResponse.COMMAND_INTERPRETED(res, { command, model })`; validation failure → `throw ErrorResponse.BAD_REQUEST(detail)`
- [x] 2.3 `src/services/ollama.service.ts` — throw `ErrorResponse.LLM_UNAVAILABLE()` / `LLM_ERROR_RESPONSE(status)` / `LLM_EMPTY_RESPONSE()` for the three failure modes
- [x] 2.4 `src/middlewares/error.middleware.ts` — both branches emit `{ code, message, data: {} }` (operational: from the `AppError`; unknown: `INTERNAL_SERVER_ERROR` + generic message), keeping the dev-only `stack` extra field

## 3. Tests

- [x] 3.1 Create `tests/utils/api-response.test.ts` — `successResponse` envelope (default `{}` data, custom data/message), `SuccessResponse` catalog entries, `ErrorResponse` catalog returns `AppError` with expected status/code/message, `defaultCodeFor` map incl. fallback `ERROR`
- [x] 3.2 Update `tests/utils/app-error.test.ts` — default and explicit `code`
- [x] 3.3 Update `tests/app.test.ts`, `tests/controllers/command.controller.test.ts`, `tests/middlewares/error.middleware.test.ts`, `tests/services/ollama.service.test.ts` — assert payloads under `data`, `code` values (incl. `NOT_FOUND` for 404, `LLM_*` for 502s), `data: {}` on errors

## 4. Verification

- [x] 4.1 `npm test` passes with all global coverage metrics >= 90%
- [x] 4.2 `npm run build` and `npm run lint` pass
- [x] 4.3 Live check: `GET /health` returns `code: "HEALTH_OK"`; unknown route returns `code: "NOT_FOUND"`; `POST /command` with Ollama stopped returns `code: "LLM_UNAVAILABLE"`

## 5. Spec Plane Updates

- [x] 5.1 Update `openspec/codebase/map.md` (new `src/utils/api-response.ts` row, HTTP surface response column)
- [x] 5.2 Create `openspec/codebase/interfaces/api-response.md`; update `interfaces/http.md`, `interfaces/error-middleware.md`, `interfaces/app-error.md` (envelope shapes, `code` field)
