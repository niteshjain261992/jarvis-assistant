## 1. Simplify resolveAgentRunResult

- [x] 1.1 Refactor `resolveAgentRunResult` in `src/agent/agent-runner.ts` to branch on `messages.at(-1)`: `ToolMessage` → parse `ToolHandlerResult` and return action; `AIMessage` → return text; otherwise clarify
- [x] 1.2 Remove `findLatestToolCallMessage`, `findToolMessage`, and unused imports (`getToolByCommandName`, `getToolMetadataByToolName`) from `src/agent/agent-runner.ts`

## 2. Update tests

- [x] 2.1 Update `tests/agent/agent-runner.test.ts`: adjust `resolveAgentRunResult` cases to assert last-message resolution (ToolMessage-only action path, AIMessage text path)
- [x] 2.2 Remove or replace tests that assert registry lookup failures (`getToolByCommandName` spy) and AIMessage-only tool-call pairing; add clarify cases for invalid/missing last ToolMessage content
- [x] 2.3 Run `npm test -- tests/agent/agent-runner.test.ts` and confirm all tests pass

## 3. Sync docs mirror (optional but recommended)

- [x] 3.1 Update `openspec/codebase/interfaces/agent-runner.md` `resolveAgentRunResult` guarantees to describe last-message resolution instead of tool-call pairing
