Source files in scope (closed-world): `openspec/codebase/map.md`, `openspec/codebase/interfaces/message.md`, `openspec/codebase/interfaces/websocket.md`, `openspec/codebase/interfaces/ollama.md`, `openspec/codebase/interfaces/api-response.md`, `openspec/codebase/interfaces/agent-runner.md` (new), `openspec/codebase/interfaces/agent-tools.md` (new), `openspec/codebase/interfaces/client-task-broker.md` (new), `openspec/codebase/interfaces/message-envelope.md` (new), `openspec/specs/api-response/spec.md`, `openspec/specs/agent-runner/spec.md`.

## 1. Codebase map

- [x] 1.1 Add `src/agent/**` and `src/websocket/client-task-broker.ts` rows to `openspec/codebase/map.md`
- [x] 1.2 Fix external-dependencies Ollama description (agent turns + summary jobs, not intent classification)

## 2. Fix existing interface docs

- [x] 2.1 Update `interfaces/message.md` — `createMessage(prompt, ws)`, `runAgentTurn(ctx, ws)`, client-action persistence notes
- [x] 2.2 Update `interfaces/websocket.md` — client-task inbound frames, `ACTION_REQUEST` outbound, `createMessage(prompt, ws)`
- [x] 2.3 Update `interfaces/ollama.md` — remove `CONVERSATION_SYSTEM_PROMPT` from exports
- [x] 2.4 Update `interfaces/api-response.md` — add `ACTION_REQUEST` to `successCodes`

## 3. New interface docs

- [x] 3.1 Create `interfaces/agent-runner.md`
- [x] 3.2 Create `interfaces/agent-tools.md`
- [x] 3.3 Create `interfaces/client-task-broker.md`
- [x] 3.4 Create `interfaces/message-envelope.md`

## 4. Sync main specs

- [x] 4.1 Apply delta to `openspec/specs/api-response/spec.md` — document `ACTION_REQUEST`
- [x] 4.2 Apply delta to `openspec/specs/agent-runner/spec.md` — `context?` param and `buildToolsForConnection(ws, context)`
