## Why

Client-executor tools (`open_camera`, `off_lights`, `play_music`) currently return a static action descriptor immediately without confirming the connected WebSocket client actually performed the action. The LLM and downstream pipeline never see a real execution outcome, so action results are optimistic rather than verified. This change introduces bidirectional client-task delegation so tool handlers round-trip to the client, await a real result, and feed that outcome back into the agent loop.

## What Changes

- Add `client-task-broker` module with request/response correlation over WebSocket (`client_task` outbound, `client_task_result` / `client_task_error` inbound)
- Convert client-executor tools from static `ToolDefinition` exports to per-connection factory functions (`build*Tool(ws)`) that await client results via the broker
- Replace static registry helpers (`getAllTools`, `getStructuredTools`) with `buildToolsForConnection(ws)`; keep metadata-only `getToolByCommandName` lookup
- **BREAKING**: `runAgent` gains a required `ws: WebSocket` parameter and binds tools per connection
- Update `resolveAgentRunResult` to derive `actionPayload` from the ToolMessage produced by the awaited tool execution (not a static metadata payload or a second invoke)
- Extend WebSocket message routing in `messages.gateway.ts` to handle `client_task_result` and `client_task_error` before the chat prompt pipeline (these are not user turns)
- Wire `ws` from the gateway through `createMessage` / `runAgentTurn` into `runAgent` (required plumbing for per-connection tools)
- Add unit tests for broker, updated tools/registry, agent-runner, and gateway routing

## Capabilities

### New Capabilities

- `client-task-broker`: In-memory request/response correlation for outbound `client_task` frames and inbound result/error frames, with timeout and cleanup

### Modified Capabilities

- `agent-tools`: Client-executor tools become async, WebSocket-scoped factories; registry exposes `buildToolsForConnection(ws)` instead of static `getAllTools` / `getStructuredTools`
- `agent-runner`: `runAgent` requires `ws`; action payloads reflect real client results from ToolMessage content
- `websocket-messages`: Inbound routing distinguishes chat prompts from client-task completion frames; outbound `client_task` frames during tool execution

## Impact

- **New file**: `src/websocket/client-task-broker.ts`
- **Modified**: `src/agent/tools/types.ts`, `registry.ts`, `index.ts`, three `*.tool.ts` files and their tests
- **Modified**: `src/agent/agent-runner.ts` and `tests/agent/agent-runner.test.ts`
- **Modified**: `src/websocket/messages.gateway.ts` (+ tests)
- **Modified**: `src/services/message.service.ts` — pass `ws` from gateway into `runAgent` (implicit dependency of the new `runAgent` signature)
- **Specs**: delta updates to `agent-tools`, `agent-runner`, `websocket-messages`; new `client-task-broker` spec
- **Out of scope**: iOS client handling of `client_task`, persistence of in-flight tasks, command-catalog semantics, CLARIFY_FALLBACK wording
