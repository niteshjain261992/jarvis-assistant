# Interface: app-error (`src/utils/app-error.ts`)

## Exports

```ts
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: errorCodes; // machine-readable; defaults via defaultCodeFor(statusCode)
  readonly isOperational: boolean;
  constructor(message: string, statusCode: number, code?: errorCodes, isOperational?: boolean);
}
```

## Guarantees

- `name` is `"AppError"`.
- `code` defaults from the status (400 → `BAD_REQUEST`, 404 → `NOT_FOUND`, 500 → `INTERNAL_SERVER_ERROR`, 502 → `BAD_GATEWAY`, fallback `ERROR`); catalog factories in `api-response.ts` pass explicit codes.
- Stack trace excludes the constructor frame (`Error.captureStackTrace`).
- `isOperational === true` means the error is safe to expose to clients via the global error handler; `false` is treated as a programmer error (masked as 500).
