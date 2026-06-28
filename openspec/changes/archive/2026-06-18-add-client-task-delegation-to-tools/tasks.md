## 1. Client task broker

- [x] 1.1 Create `src/websocket/client-task-broker.ts` with `CLIENT_TASK_TIMEOUT_MS`, module-level pending map, `requestFromClient`, `resolveClientTask`, and `rejectClientTask`
- [x] 1.2 Add `tests/websocket/client-task-broker.test.ts` — outbound frame shape, resolve/reject, timeout cleanup, unknown requestId no-op

## 2. Tool types and factories

- [x] 2.1 Add `ClientToolFactory` type alias and WebSocket import to `src/agent/tools/types.ts`
- [x] 2.2 Convert `open-camera.tool.ts` to export `openCameraMetadata` (unchanged) and `buildOpenCameraTool(ws)` that awaits `requestFromClient`
- [x] 2.3 Convert `off-lights.tool.ts` to `buildOffLightsTool(ws)` with the same pattern
- [x] 2.4 Convert `play-music.tool.ts` to `buildPlayMusicTool(ws)` with the same pattern
- [x] 2.5 Update `tests/agent/tools/open-camera.tool.test.ts`, `off-lights.tool.test.ts`, `play-music.tool.test.ts` — factory + mock ws, resolve success, reject/timeout propagation

## 3. Tool registry and public API

- [x] 3.1 Refactor `src/agent/tools/registry.ts` — static metadata table, `assertUniqueToolDefinitions` at load, `buildToolsForConnection(ws)`, metadata-only `getToolByCommandName`; remove `getAllTools` / `getStructuredTools`
- [x] 3.2 Update `src/agent/tools/index.ts` re-exports (`buildToolsForConnection`, `getToolByCommandName`, `ClientToolFactory`)
- [x] 3.3 Update `tests/agent/tools/registry.test.ts` for per-connection build and metadata lookup

## 4. Agent runner

- [x] 4.1 Change `runAgent(input, ws)` to use `buildToolsForConnection(ws).map(d => d.tool)`
- [x] 4.2 Update `resolveAgentRunResult` to find AIMessage with `tool_calls`, read matching ToolMessage content for `actionPayload` (no second invoke)
- [x] 4.3 Update `tests/agent/agent-runner.test.ts` — pass mock `ws` everywhere; add test asserting client `result` in `actionPayload`

## 5. WebSocket routing and pipeline wiring

- [x] 5.1 Route `client_task_result` and `client_task_error` in `src/websocket/messages.gateway.ts` before chat prompt handling
- [x] 5.2 Update `createMessage(prompt, ws)` and `runAgentTurn` in `src/services/message.service.ts` to pass `ws` to `runAgent`
- [x] 5.3 Add gateway tests under `tests/websocket/` for client-task frame routing (no `createMessage` on result/error frames)

## 6. Verification

- [x] 6.1 Run full `npm test` and fix any failures
- [x] 6.2 Grep for remaining `getAllTools` / `getStructuredTools` usages outside removed exports and update callers
