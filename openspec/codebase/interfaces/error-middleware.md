# Interface: error-middleware (`src/middlewares/error.middleware.ts`)

## Exports

```ts
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void;

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void;
```

## Guarantees

- `notFoundHandler`: forwards `AppError("Route <METHOD> <url> not found", 404)` to the error chain. Must be registered after all routes.
- `globalErrorHandler` (must be registered last):
  - Operational `AppError` → its `statusCode`, body `{ code: err.code, message, data: {} }`.
  - Anything else → logs full error via the shared logger, responds 500 `{ code: "INTERNAL_SERVER_ERROR", message: "Internal server error", data: {} }`.
  - `stack` field included in body only when `NODE_ENV !== "production"`.
- Never throws; always terminates the request with a JSON response.
