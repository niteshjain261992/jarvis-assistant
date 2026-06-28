# Interface: domain-errors (`src/errors/`)

## Public barrel (`src/errors/index.ts`)

```ts
export { JarvisErrorType } from './types.js';
export { isJarvisError, JarvisError } from './jarvis-error.js';
export { throwClientTimeout, throwClientError, throwServerError } from './throw-error.js';
export { handleJarvisError } from './handle-error.js';
export type { ErrorHandlingContext, ToolErrorHandlingContext } from './handle-error.js';
```

Domain errors are separate from HTTP `AppError` (`src/utils/app-error.ts`). Use `JarvisError` for broker and tool flows; HTTP middleware continues to handle `AppError` only.

## Error types (`JarvisErrorType`)

| Type | Meaning |
|---|---|
| `CLIENT_TIMEOUT` | Mobile client did not respond within broker timeout |
| `CLIENT_ERROR` | Client explicitly rejected via `rejectClientTask` |
| `SERVER_ERROR` | Server-side failure (resolver, platform API, config) |

## Throw factories (`throw-error.ts`)

- `throwClientTimeout(message, details?)` — never returns
- `throwClientError(message, details?)` — never returns
- `throwServerError(message, details?)` — never returns

## Central handler (`handle-error.ts`)

`handleJarvisError(error, context)` is the single dispatcher for typed domain errors.

- **`mode: 'tool'`** with `onClientTimeout` callback — catches `CLIENT_TIMEOUT` and returns callback result
- **`CLIENT_ERROR`**, **`SERVER_ERROR`**, non-`JarvisError` — rethrows

Example (play_music tool):

```ts
clientResult = handleJarvisError(err, {
  mode: 'tool',
  onClientTimeout: (error) => ({
    status: 'client_timeout',
    type: error.type,
    message: error.message,
  }),
});
```

## Related

- See `interfaces/app-error.md` for HTTP operational errors.
- See `interfaces/client-task-broker.md` for broker rejection types.
- See `interfaces/agent-tools.md` for play_music timeout handling.
