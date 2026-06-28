# Error Handling

Binding law for all error handling in this repo.

## AppError

- All expected (operational) failures MUST be represented as `AppError` from `src/utils/app-error.ts`.
- `AppError` carries `statusCode: number` and `isOperational: boolean` (default `true`).
- Never throw raw strings or plain `Error` for expected failure paths.

## Pipeline

- Errors reach the client ONLY through `globalErrorHandler` in `src/middlewares/error.middleware.ts`, registered last in `app.ts`.
- Unmatched routes are converted to `AppError(404)` by `notFoundHandler`, registered after all routes.
- Controllers/middleware propagate errors via `next(err)` (or by throwing in async handlers under Express 5, which forwards automatically).

## Response contract

- Operational errors: `{ status: "error", message }` with the error's `statusCode`.
- Unknown/programmer errors: logged in full server-side; client receives generic HTTP 500 `{ status: "error", message: "Internal server error" }`.
- Stack traces appear in responses ONLY when `NODE_ENV !== "production"`.

## Prohibitions

- No `res.status(...).json(...)` error responses outside the global handler.
- No swallowing errors (empty catch blocks).
- No process exit calls outside `src/server.ts` and `src/config/env.ts` (startup validation).
