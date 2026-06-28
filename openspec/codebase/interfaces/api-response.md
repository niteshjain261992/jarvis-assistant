# Interface: api-response (`src/utils/api-response.ts`)

## Envelope

Every JSON response, success or error:

```ts
{ code: string, message: string, data: object } // data defaults to {}
```

## Exports

```ts
export enum successCodes {
  HEALTH_OK, MESSAGE_COMPLETED, MESSAGE_FAILED, ACTION_REQUEST,
} // string enum
export enum errorCodes {
  BAD_REQUEST, NOT_FOUND, INTERNAL_SERVER_ERROR, BAD_GATEWAY, ERROR,
  LLM_UNAVAILABLE, LLM_ERROR_RESPONSE, LLM_EMPTY_RESPONSE,
} // string enum

export function defaultCodeFor(statusCode: number): errorCodes; // 400/404/500/502 map, fallback ERROR

export function successResponse(
  res: Response, httpStatusCode: number, code: successCodes, message: string, data?: object,
): void; // sends res.status(...).json(envelope)

export const SuccessResponse: {
  HEALTH_OK: (res: Response, data: object) => void;              // 200, "Service is healthy"
  MESSAGE_COMPLETED: (res: Response, data: object) => void;        // 200, "Message completed"
  MESSAGE_FAILED: (res: Response, data: object) => void;         // 200, "Message failed"
};

export const ErrorResponse: {
  BAD_REQUEST: (message?: string) => AppError;        // 400
  NOT_FOUND: (message?: string) => AppError;          // 404
  LLM_UNAVAILABLE: () => AppError;                    // 502
  LLM_ERROR_RESPONSE: (upstreamStatus: number) => AppError; // 502
  LLM_EMPTY_RESPONSE: () => AppError;                 // 502
};
```

## Guarantees

- `SuccessResponse` entries send the response; `ErrorResponse` entries only construct `AppError`s — callers `throw` them so every error response exits through `globalErrorHandler`.
- Circular import with `app-error.ts` is intentional and safe (cross-references only inside function bodies).
- Controllers respond exclusively via `SuccessResponse`/thrown `ErrorResponse`; no inline envelope construction.
- `ACTION_REQUEST` is used by WebSocket client-action delegation via `message-envelope.ts`, not by HTTP `SuccessResponse` helpers.
