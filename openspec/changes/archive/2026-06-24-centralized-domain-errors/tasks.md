## 1. Errors module

- [x] 1.1 Create `src/errors/types.ts` with `JarvisErrorType` enum (`CLIENT_TIMEOUT`, `CLIENT_ERROR`, `SERVER_ERROR`)
- [x] 1.2 Create `src/errors/jarvis-error.ts` with `JarvisError` class and `isJarvisError` helper
- [x] 1.3 Create `src/errors/throw-error.ts` with `throwClientTimeout`, `throwClientError`, `throwServerError` factories
- [x] 1.4 Create `src/errors/handle-error.ts` with `handleJarvisError(error, context)` dispatcher (tool mode + `onClientTimeout` callback)
- [x] 1.5 Create `src/errors/index.ts` public barrel re-exporting types, class, throw factories, and handler

## 2. Migrate client-task-broker

- [x] 2.1 Update timeout rejection in `client-task-broker.ts` to reject with `JarvisError` `CLIENT_TIMEOUT`
- [x] 2.2 Update `rejectClientTask` to reject with `JarvisError` `CLIENT_ERROR`
- [x] 2.3 Update broker tests to expect `JarvisError` types

## 3. Migrate play-music

- [x] 3.1 Replace plain `throw new Error(...)` in play-music resolvers/platforms with `throwServerError`
- [x] 3.2 Update `play-music/index.ts` to use `handleJarvisError` instead of `isClientTaskTimeoutError` inline catch
- [x] 3.3 Delete `src/agent/tools/play-music/client-timeout.ts` and remove all imports
- [x] 3.4 Update play-music tests for typed errors and handler-driven timeout result (include `type: 'CLIENT_TIMEOUT'` in result)

## 4. Errors module tests

- [x] 4.1 Add `tests/errors/jarvis-error.test.ts` — construction and `isJarvisError`
- [x] 4.2 Add `tests/errors/throw-error.test.ts` — each factory throws correct type
- [x] 4.3 Add `tests/errors/handle-error.test.ts` — timeout callback, rethrow for SERVER/CLIENT errors and unknown errors
- [x] 4.4 Run `npm test` and confirm pass

## 5. Documentation

- [x] 5.1 Add `openspec/codebase/interfaces/domain-errors.md` documenting module layout and usage
- [x] 5.2 Update `openspec/codebase/interfaces/agent-tools.md` — reference centralized error handler instead of `client-timeout.ts`
