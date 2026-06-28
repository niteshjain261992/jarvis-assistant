## 1. Agent runner cleanup

- [x] 1.1 Remove `ToolMessage` and `ToolHandlerResult` imports from `src/agent/agent-runner.ts`
- [x] 1.2 Remove `kind: 'action'` variant from `AgentRunResult` type
- [x] 1.3 Delete `parseToolHandlerResult` function entirely
- [x] 1.4 Simplify `resolveAgentRunResult` to AIMessage-only last-message resolution (text or clarify)

## 2. Message service cleanup

- [x] 2.1 Delete `runServerAction` function from `src/services/message.service.ts`
- [x] 2.2 Remove entire `kind: 'action'` branch in `runAgentTurn` (lines ~262–327); unify text/clarify persistence path
- [x] 2.3 Grep and remove unused imports (`MessageActionExecutor` if no longer referenced); confirm `randomUUID` import stays

## 3. Agent runner tests

- [x] 3.1 Remove `ToolMessage` import and `buildActionMessages` helper from `tests/agent/agent-runner.test.ts`
- [x] 3.2 Remove all ToolMessage-as-last-message tests (action expectations, invalid JSON, unsupported shape, missing metadata)
- [x] 3.3 Update `runAgent` tests: remove action mock test; update conversational/action phrasing tests to expect `kind: 'text'` only
- [x] 3.4 Add test: `[AIMessage(tool_calls), ToolMessage(...), AIMessage('Done')]` → `kind: 'text', content: 'Done'`

## 4. Message service tests

- [x] 4.1 Remove tests mocking `runAgent` returning `kind: 'action'` (client action, broker reuse, server action)
- [x] 4.2 Remove `findLatestActionMessageByParentIdMock` variable, beforeEach default, and all assertions on it
- [x] 4.3 Confirm remaining text/clarify/error tests pass unchanged

## 5. Verification

- [x] 5.1 Run `npm test` — all tests pass, coverage above 90% gate
- [x] 5.2 Grep `src/`: zero hits for `ToolMessage`, `parseToolHandlerResult`, `runServerAction`, `kind.*action`
- [x] 5.3 Grep `src/services/`: zero hits for `findLatestActionMessageByParentId` (repository definition in `repositories/` stays)
