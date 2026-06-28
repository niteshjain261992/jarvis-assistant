# Proposal: unify-api-response

## Why

Every endpoint currently invents its own response shape: `GET /health` returns `{ status, uptime, timestamp }`, `POST /command` returns `{ command, model }`, and errors return `{ status: "error", message }`. Clients must special-case each endpoint. A single envelope with typed, machine-readable codes makes parsing uniform and failure causes distinguishable.

## What Changes

- **BREAKING**: All JSON responses (success and error) adopt one envelope:
  - `code`: machine-readable string from central `successCodes`/`errorCodes` enums (e.g. `HEALTH_OK`, `COMMAND_INTERPRETED`, `BAD_REQUEST`, `LLM_UNAVAILABLE`)
  - `message`: human-readable summary
  - `data`: payload object, defaulting to `{}` (including on errors)
- New `src/utils/api-response.ts`: code enums, `successResponse` builder, and named catalogs — `SuccessResponse.X(res, data?)` sends success responses; `ErrorResponse.Y(...)` returns `AppError`s to throw, keeping all errors flowing through the global handler
- `AppError` gains a `code` field (status-derived default, catalog-overridable)
- Distinct error codes per Ollama failure mode (`LLM_UNAVAILABLE`, `LLM_ERROR_RESPONSE`, `LLM_EMPTY_RESPONSE`)
- `GET /health`, `POST /command`, error handler, and the Ollama service adopt the catalogs
- Stack traces remain a dev-only extra field on error responses
- All existing tests updated; new unit tests for the helper module (coverage gate >= 90% per `engineering/testing.md`)

## Capabilities

### New Capabilities

- `api-response`: the unified envelope contract, typed code enums, and the `SuccessResponse`/`ErrorResponse` catalog pattern

### Modified Capabilities

- `http-server`: health-check response moves inside `data` with `code: HEALTH_OK`
- `command-interpretation`: command response moves inside `data` with `code: COMMAND_INTERPRETED`; per-failure-mode 502 codes
- `error-handling`: `AppError` carries a `code`; error responses become the envelope

## Impact

- **Code**: new `src/utils/api-response.ts`; edits to `src/utils/app-error.ts`, `src/controllers/health.controller.ts`, `src/controllers/command.controller.ts`, `src/middlewares/error.middleware.ts`, `src/services/ollama.service.ts`
- **Tests**: update `tests/app.test.ts`, `tests/controllers/command.controller.test.ts`, `tests/middlewares/error.middleware.test.ts`, `tests/utils/app-error.test.ts`, `tests/services/ollama.service.test.ts`; add `tests/utils/api-response.test.ts`
- **Spec plane**: new `openspec/specs/api-response/spec.md`; deltas for `http-server`, `command-interpretation`, `error-handling`; updates to `openspec/codebase/map.md` and `interfaces/` docs
- **Clients**: BREAKING — consumers must read payloads from `data` and switch on `code`
