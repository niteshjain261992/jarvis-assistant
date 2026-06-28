## 1. Timeout helper

- [x] 1.1 Add `src/agent/tools/play-music/client-timeout.ts` with `isClientTaskTimeoutError(error: unknown): boolean` matching broker message `Client task timed out after {N}ms`

## 2. Handler try/catch

- [x] 2.1 Wrap `requestFromClient` in `play-music/index.ts` with try/catch; on timeout return `ToolHandlerResult` with resolved fields and `result: { status: 'client_timeout', message }`
- [x] 2.2 Re-throw non-timeout errors from `requestFromClient`; do not catch resolver errors

## 3. Tests

- [x] 3.1 Add `tests/agent/tools/play-music/client-timeout.test.ts` for `isClientTaskTimeoutError`
- [x] 3.2 Update `tests/agent/tools/play-music.tool.test.ts` — replace timeout propagation test with graceful timeout return; add test that non-timeout client errors still propagate
- [x] 3.3 Run `npm test -- tests/agent/tools/play-music tests/agent/tools/play-music.tool.test.ts` and confirm pass

## 4. Documentation

- [x] 4.1 Update `openspec/codebase/interfaces/agent-tools.md` — note play_music catches client timeouts and returns `result.status: 'client_timeout'`
