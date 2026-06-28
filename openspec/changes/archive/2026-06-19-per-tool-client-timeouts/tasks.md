## 1. Client task broker

- [x] 1.1 Add optional `timeoutMs?: number` fifth parameter to `requestFromClient` in `src/websocket/client-task-broker.ts`
- [x] 1.2 Resolve `effectiveTimeoutMs = timeoutMs ?? CLIENT_TASK_TIMEOUT_MS` and use it for `setTimeout`, rejection messages, and persisted timeout `errorDetails`

## 2. Tool metadata and call sites

- [x] 2.1 Add `clientTimeoutMs` to `openCameraMetadata` (30_000) in `src/agent/tools/open-camera.tool.ts` and pass it to `requestFromClient`
- [x] 2.2 Add `clientTimeoutMs` to `offLightsMetadata` (5_000) in `src/agent/tools/off-lights.tool.ts` and pass it to `requestFromClient`
- [x] 2.3 Add `clientTimeoutMs` to `playMusicMetadata` (15_000) in `src/agent/tools/play-music.tool.ts` and pass it to `requestFromClient`

## 3. Tests

- [x] 3.1 Update `tests/websocket/client-task-broker.test.ts`: add custom-timeout rejection test, custom-timeout resolve-before-expiry test, and assert default path still uses `CLIENT_TASK_TIMEOUT_MS`
- [x] 3.2 Update `tests/agent/tools/open-camera.tool.test.ts`, `tests/agent/tools/off-lights.tool.test.ts`, and `tests/agent/tools/play-music.tool.test.ts` to assert `requestFromClient` receives each tool's `clientTimeoutMs`
- [x] 3.3 Run `npm test` and confirm all broker and agent tool tests pass
