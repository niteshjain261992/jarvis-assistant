## Why

Errors are currently thrown as plain `Error` strings across the client-task broker, play-music resolvers, and tool handlers, with ad-hoc detection (e.g. regex on timeout messages in `client-timeout.ts`). This makes error handling inconsistent and spreads recovery logic across call sites. A shared error model with typed categories and a single handler will make failures predictable and easier to extend.

## What Changes

- Add a new `src/errors/` module with typed domain errors (`CLIENT_TIMEOUT`, `CLIENT_ERROR`, `SERVER_ERROR`).
- Introduce a `JarvisError` class (or equivalent) carrying `type`, `message`, and optional metadata.
- Add a `throw-error.ts` factory file for creating typed errors at throw sites (replacing raw `new Error(...)` in migrated code).
- Add a `handle-error.ts` central dispatcher that maps typed errors to outcomes (rethrow, structured tool result, etc.) based on context.
- Migrate `client-task-broker` timeout and client rejections to throw typed `JarvisError` instances.
- Migrate `play-music` resolvers and tool handler to use typed throws and the centralized handler (remove `play-music/client-timeout.ts`).
- Keep existing HTTP `AppError` / global middleware unchanged for REST; domain errors integrate at tool/broker boundaries first.
- Add unit tests for error types, throw factories, handler branches, and migrated call sites.

## Capabilities

### New Capabilities

- `domain-errors`: Typed domain error model, throw factories, and centralized error handler for non-HTTP flows.

### Modified Capabilities

- `error-handling`: Document relationship between HTTP `AppError` and domain `JarvisError`; domain errors are operational and classified by `type`.
- `client-task-broker`: Timeout and explicit client rejections produce `JarvisError` with types `CLIENT_TIMEOUT` and `CLIENT_ERROR`.
- `agent-tools`: `play_music` uses centralized error handling instead of local timeout string matching; resolver failures throw `SERVER_ERROR`.

## Impact

- **Code**: new `src/errors/` folder; `client-task-broker.ts`, `play-music/*`, tests under `tests/errors/` and updated tool/broker tests
- **Removed**: `src/agent/tools/play-music/client-timeout.ts` (logic moves to `src/errors/`)
- **HTTP API**: no envelope change; `AppError` pipeline unchanged
- **Tool behavior**: same outward behavior for play_music timeout graceful return, but driven by typed error handling
