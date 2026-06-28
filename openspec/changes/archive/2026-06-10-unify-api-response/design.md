# Design

## Context

Three response shapes exist today, produced in `health.controller.ts`, `command.controller.ts`, and `error.middleware.ts`. Engineering law: error responses leave only through the global handler; every behavior change ships tests (`engineering/testing.md`). The user specified the envelope `{ code, message, data }` and a catalog pattern: typed `successCodes`/`errorCodes` enums with named factory functions (`SuccessResponse.X(...)`, `ErrorResponse.Y(...)`) carrying predefined codes and default messages.

## Goals / Non-Goals

**Goals:**

- One envelope for every JSON response: `{ code, message, data }` (`data` defaults to `{}`)
- Typed code enums + named catalogs so call sites read as intent (`SuccessResponse.COMMAND_INTERPRETED(...)`, `ErrorResponse.BAD_REQUEST(...)`)
- Errors keep flowing through `AppError` + global handler; tests updated, 90% gate green

**Non-Goals:**

- Versioned APIs, pagination/meta fields
- Changing HTTP status semantics
- Migrating the env-validation bootstrap report (not an HTTP response)

## Decisions

### 1. Envelope contract

```ts
{ code: string, message: string, data: object } // data defaults to {}
```

Success and error use the same shape; `code` comes from a central enum (`successCodes` / `errorCodes`).

### 2. Catalog pattern adapted to Express's error pipeline

The reference pattern (Next.js) has `ErrorResponse.X()` build and return the HTTP response directly. Here that would violate the "errors only through the global handler" law and bypass logging/stack handling. Adaptation:

- **`SuccessResponse` catalog sends**: each entry is `(res, data?) => void` calling `successResponse(res, httpStatusCode, code, message, data)`, e.g. `SuccessResponse.HEALTH_OK(res, { status, uptime, timestamp })`, `SuccessResponse.COMMAND_INTERPRETED(res, { command, model })`
- **`ErrorResponse` catalog throws**: each entry returns an `AppError` with a predefined `errorCode` and default message, e.g. `throw ErrorResponse.BAD_REQUEST(detail)`, `throw ErrorResponse.LLM_UNAVAILABLE()`. The global handler emits the envelope from the error's `statusCode`, `code`, and `message`

This keeps the one-exit-point error architecture while giving call sites the catalog ergonomics.

### 3. `AppError` gains a `code` field

`AppError(message, statusCode, code = defaultCodeFor(statusCode), isOperational = true)` — `code` is an `errorCodes` member; the default map covers 400/404/500/502 (`BAD_REQUEST`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`, `BAD_GATEWAY`, fallback `ERROR`) so errors raised outside the catalog (e.g. `notFoundHandler`) still get a correct code.

### 4. Module layout: `src/utils/api-response.ts`

One module exports `successCodes`, `errorCodes` (string enums), the low-level builders `successResponse(res, httpStatusCode, code, message, data = {})` and the `SuccessResponse`/`ErrorResponse` catalogs. The success path imports Express's `Response` type (utils are not services; the no-Express rule binds services only). Domain error codes for Ollama failures: `LLM_UNAVAILABLE`, `LLM_ERROR_RESPONSE`, `LLM_EMPTY_RESPONSE` (all 502) — the service throws via the catalog, giving clients distinguishable causes.

### 5. Error handler emits the envelope; stack stays dev-only

`globalErrorHandler` responds `res.status(err.statusCode).json({ code: err.code, message: err.message, data: {}, ...(dev ? { stack } : {}) })`; unknown errors map to `errorCodes.INTERNAL_SERVER_ERROR` with the generic message. The dev-only `stack` is an additive field outside the core contract.

### 6. Test updates ride along

Existing assertions move to `body.data.*`/`body.code`; new `tests/utils/api-response.test.ts` covers builders, both catalogs, and the status→code default map (including fallback) to keep branch coverage >= 90%.

## Risks / Trade-offs

- [BREAKING for any client parsing old shapes] → single client owned by the same project; coordinated update
- [Catalog can sprawl into a god-module as endpoints grow] → entries are one-liners; split per-domain catalogs when it hurts
- [`data: {}` on errors carries no information] → matches the requested contract; field reserved for structured error details later
