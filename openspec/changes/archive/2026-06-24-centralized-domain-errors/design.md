## Context

Today the codebase has two error layers:

1. **HTTP layer**: `AppError` + `errorCodes` in `src/utils/app-error.ts` and `api-response.ts`, handled by `globalErrorHandler`.
2. **Domain layer**: plain `Error` strings in broker, resolvers, and tools; play_music uses `isClientTaskTimeoutError()` regex matching broker messages.

The user wants all domain throws classified (`CLIENT_TIMEOUT`, `CLIENT_ERROR`, `SERVER_ERROR`) and handled in one place.

## Goals / Non-Goals

**Goals:**

- Create `src/errors/` with:
  - `types.ts` — `JarvisErrorType` enum
  - `jarvis-error.ts` — `JarvisError` class
  - `throw-error.ts` — factories: `throwClientTimeout`, `throwClientError`, `throwServerError` (never return; always throw)
  - `handle-error.ts` — `handleJarvisError(error, context)` central dispatcher
  - `index.ts` — public barrel
- Migrate broker and play-music to typed errors and centralized handling.
- Preserve play_music graceful timeout behavior via handler, not inline try/catch logic.

**Non-Goals:**

- Replacing or merging `AppError` into `JarvisError` for HTTP responses in v1.
- Migrating every `throw new Error` in the entire codebase (registry duplicates, agenda, etc.) — focus on client-task + play-music paths first.
- Adding new HTTP error codes to `errorCodes` enum unless needed later.

## Decisions

### 1. Folder layout

```
src/errors/
  types.ts           # JarvisErrorType enum
  jarvis-error.ts    # JarvisError class
  throw-error.ts     # typed throw factories
  handle-error.ts    # handleJarvisError + helpers (isJarvisError, normalizeUnknownError)
  index.ts           # re-exports
```

**Alternative:** Put under `src/utils/errors/`. Rejected — user asked for a dedicated folder; `errors/` is clearer at top level.

### 2. Error type enum

```ts
export enum JarvisErrorType {
  CLIENT_TIMEOUT = 'CLIENT_TIMEOUT',
  CLIENT_ERROR = 'CLIENT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
}
```

- `CLIENT_TIMEOUT` — mobile client did not respond in time (broker timeout).
- `CLIENT_ERROR` — client explicitly rejected via `rejectClientTask`.
- `SERVER_ERROR` — server-side failure (resolver, platform API, missing config, unsupported platform).

Future types (e.g. `VALIDATION_ERROR`) can be added without changing handler contract.

### 3. JarvisError class

```ts
export class JarvisError extends Error {
  readonly type: JarvisErrorType;
  readonly details?: Record<string, unknown>;

  constructor(type: JarvisErrorType, message: string, details?: Record<string, unknown>);
}
```

- `name` = `'JarvisError'`
- `Error.captureStackTrace` at construction
- Plain `Error` instances remain possible from third-party code; handler treats unknown errors as rethrow

### 4. Throw factories (`throw-error.ts`)

Named functions that throw (never return) for consistent construction:

```ts
export function throwClientTimeout(message: string, details?: Record<string, unknown>): never;
export function throwClientError(message: string, details?: Record<string, unknown>): never;
export function throwServerError(message: string, details?: Record<string, unknown>): never;
```

Broker migration:
- Timeout: `throwClientTimeout(\`Client task timed out after ${ms}ms\`, { timeoutMs: ms })`
- Reject: wrap client message in `throwClientError(error)` or `new JarvisError(CLIENT_ERROR, error)`

Resolvers/platforms: replace `throw new Error(...)` with `throwServerError(...)`.

### 5. Central handler (`handle-error.ts`)

```ts
export type ToolErrorHandlingContext = {
  mode: 'tool';
  onClientTimeout: (error: JarvisError) => unknown; // e.g. return structured result
};

export type ErrorHandlingContext = ToolErrorHandlingContext; // extensible

export function handleJarvisError(error: unknown, context: ErrorHandlingContext): unknown;
```

Default behavior:
- If not `JarvisError` → rethrow
- `CLIENT_TIMEOUT` + `mode: 'tool'` + `onClientTimeout` provided → return `onClientTimeout(error)` result
- `CLIENT_ERROR` or `SERVER_ERROR` → rethrow
- Unknown type → rethrow

**play_music usage:**

```ts
try {
  clientResult = await requestFromClient(...);
} catch (err) {
  clientResult = handleJarvisError(err, {
    mode: 'tool',
    onClientTimeout: (e) => ({
      status: 'client_timeout',
      message: e.message,
      type: e.type,
    }),
  });
}
```

If handler rethrows, it propagates. Removes need for `isClientTaskTimeoutError`.

**Alternative:** Handler returns discriminated union `{ action: 'return', value } | { action: 'rethrow', error }`. Rejected — using callback for timeout recovery keeps play_music payload shape local while classification stays central.

Also export:
- `isJarvisError(error: unknown): error is JarvisError`
- `isJarvisErrorType(error: unknown, type: JarvisErrorType): boolean`

### 6. Relationship to AppError

Keep separate:
- `AppError` — HTTP status + `errorCodes` for REST/WebSocket operational envelopes where already used.
- `JarvisError` — domain classification for broker/tools.

No automatic conversion in v1. If a tool error must become HTTP 502 later, map explicitly at the service boundary.

### 7. Remove `play-music/client-timeout.ts`

Timeout detection moves to `instanceof JarvisError && type === CLIENT_TIMEOUT`. Delete file and update imports/tests.

## Risks / Trade-offs

- **[Risk] Two error class hierarchies** → **Mitigation:** Document in error-handling spec; domain errors scoped to broker/tools initially.
- **[Risk] Breaking tests that assert plain Error messages** → **Mitigation:** Update broker/tool tests to expect `JarvisError` type.
- **[Risk] Handler over-generalized too early** → **Mitigation:** v1 only implements `mode: 'tool'` branch; extend when second consumer appears.

## Migration Plan

1. Add `src/errors/` module with tests.
2. Migrate `client-task-broker` reject paths to `JarvisError`.
3. Migrate play-music resolvers to `throwServerError`.
4. Replace play_music try/catch with `handleJarvisError`; delete `client-timeout.ts`.
5. Update docs mirror under `openspec/codebase/interfaces/`.

## Open Questions

- Should `rejectClientTask` wrap arbitrary strings as `CLIENT_ERROR` automatically? **Decision for v1:** yes, broker always throws `JarvisError(CLIENT_ERROR, error)`.
