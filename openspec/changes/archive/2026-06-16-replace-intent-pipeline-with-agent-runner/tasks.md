## 1. Message pipeline cutover

- [x] 1.1 Add `runAgentTurn(ctx: PipelineContext)` in `src/services/message.service.ts` — fetch recent messages, call `runAgent`, map `text`/`clarify`/`action` outcomes, reuse `runServerAction` for server executor, update assistant row, advance `lastSequenceNumber`, call `scheduleConversationSummary`, return `CreateMessageResult`
- [x] 1.2 Simplify `createMessage` orchestrator — remove `classifyIntent` and switch; call `runAgentTurn` inside `withPipelineErrorRecovery`
- [x] 1.3 Remove `handleConversationBranch`, `handleActionBranch`, `handleImageBranch`
- [x] 1.4 Remove `classifiedIntent` from `PipelineContext` and `intent` from `PipelineLogContext`; remove `imageBranch` pipeline stage if unused; update debug logs for agent turn
- [x] 1.5 Remove unused imports (`classifyIntent`, `generateConversationResponse`, `interpretCommand`, `MessageIntent`, `getCommandCatalogEntry` if no longer needed)

## 2. Ollama service cleanup

- [x] 2.1 Grep `src/` and `tests/` for references to `classifyIntent`, `interpretCommand`, `generateConversationResponse`, `MessageIntent`, `INTENT_SYSTEM_PROMPT`, `buildConversationPrompt`
- [x] 2.2 Remove `classifyIntent`, `MessageIntent`, `parseIntent`, `INTENT_SYSTEM_PROMPT`, `INTENT_TIMEOUT_MS`, `interpretCommand`, `COMMAND_TIMEOUT_MS`, and `generateConversationResponse` from `src/services/ollama.service.ts` when unreferenced
- [x] 2.3 Keep `CONVERSATION_SYSTEM_PROMPT`, `filterCompletedContextMessages`, `summarizeText`, and any helpers still imported by agent-runner or summary jobs

## 3. Config cleanup

- [x] 3.1 Remove `AGENT_RUNTIME` from `src/config/env.ts`, `.env.example`, and `tests/config/env.test.ts`
- [x] 3.2 Grep for `buildCommandSystemPrompt`; remove from `src/config/command-catalog.ts` if unused; update `tests/config/command-catalog.test.ts` accordingly

## 4. Tests

- [x] 4.1 Rewrite `tests/services/message.service.test.ts` — mock `runAgent` from `@/agent/agent-runner.js`; cover `text`, `clarify`, server action, client action; assert `scheduleConversationSummary` and `lastSequenceNumber` for all four; remove legacy branch tests
- [x] 4.2 Remove `classifyIntent` and `interpretCommand` describe blocks from `tests/services/ollama.service.test.ts`
- [x] 4.3 Update any remaining tests broken by removed exports

## 5. OpenSpec and engineering docs

- [x] 5.1 Update `openspec/engineering/service-structure.md` reference table — replace branch handler rows with `runAgentTurn`
- [x] 5.2 Update `openspec/codebase/interfaces/message.md` and `openspec/codebase/interfaces/ollama.md` to reflect agent-driven pipeline
- [x] 5.3 On archive: sync delta specs to main specs and archive `openspec/specs/command-interpretation/`

## 6. Verification

- [x] 6.1 Run full test suite (`npm test`)
- [x] 6.2 Run eslint
- [x] 6.3 Grep `src/` and `tests/` for zero references to: `classifyIntent`, `interpretCommand`, `MessageIntent`, `handleConversationBranch`, `handleActionBranch`, `handleImageBranch`, `INTENT_SYSTEM_PROMPT`, `buildCommandSystemPrompt` (if removed), `AGENT_RUNTIME`
- [x] 6.4 Confirm TypeScript build passes (no dangling imports)

## 7. Manual verification (pre-merge gate)

- [ ] 7.1 WebSocket: "open the camera" → action response with sensible fields
- [ ] 7.2 WebSocket: "what is my name" → text response
- [ ] 7.3 WebSocket: "turn off lights" → action response
- [ ] 7.4 WebSocket: deliberately ambiguous prompt → clarify persisted as completed text
