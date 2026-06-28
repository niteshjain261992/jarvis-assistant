## Context

The agent architecture evolved in two phases:

1. **Original**: `resolveAgentRunResult` parsed the last `ToolMessage` as `ToolHandlerResult` and returned `kind: 'action'`. `runAgentTurn` then either looked up a broker-persisted action row (`findLatestActionMessageByParentId`) or inserted a server action row via `runServerAction`.

2. **Current reality**: Client tools (`open_camera`, `off_lights`, `play_music`) await `requestFromClient` inside their handler. The broker inserts the action row, sends `client_task` to mobile, waits for the result, and updates the action row — all before the tool returns. `createAgent` then produces a final `AIMessage` synthesizing the outcome. The last message is never a `ToolMessage`.

The `kind: 'action'` path in `runAgentTurn` was a second dispatch layer that duplicated broker work and is never reached in production.

## Goals / Non-Goals

**Goals:**

- Remove dead code: `parseToolHandlerResult`, `ToolMessage` branch, `runServerAction`, `runAgentTurn` action branch.
- Simplify `AgentRunResult` to `{ kind: 'text' } | { kind: 'clarify' }`.
- Simplify `resolveAgentRunResult` to AIMessage-only last-message resolution.
- Update tests and specs to match.

**Non-Goals:**

- Changing `CreateMessageResult` type union (still includes `'action'` for broker-persisted rows read elsewhere).
- Modifying `client-task-broker.ts`, `message.repository.ts`, or `MessageModel`.
- Removing `findLatestActionMessageByParentId` from the repository.
- Changing how client tools execute or persist actions.

## Decisions

### 1. resolveAgentRunResult reads only the last AIMessage

```ts
export async function resolveAgentRunResult(messages): Promise<AgentRunResult> {
  const lastMessage = messages.at(-1);
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return { kind: 'clarify', content: CLARIFY_FALLBACK };
  }
  const content = extractTextContent(lastMessage);
  if (!content) return { kind: 'clarify', content: CLARIFY_FALLBACK };
  return { kind: 'text', content };
}
```

When `createAgent` ends with `[..., ToolMessage, AIMessage('Done')]`, the last message is the AIMessage — handled correctly. When it hypothetically ended with ToolMessage only, result is `clarify` (dead in practice).

**Alternative:** Keep ToolMessage branch as fallback. Rejected — dead code that misdocuments the execution model.

### 2. runAgentTurn unified text/clarify path

Both `text` and `clarify` persist assistant row as `type: 'text'`, `status: 'completed'`, advance `lastSequenceNumber` to `assistantSequence`, return `CreateMessageResult.type: 'text'`.

Action persistence for client tools remains entirely in `client-task-broker.ts` during `requestFromClient`.

### 3. WebSocket response for tool turns

`createMessage` returns `type: 'text'` with the agent's final message content. Action rows exist in MongoDB from broker insertion but are not re-read for the WebSocket `MESSAGE_COMPLETED` envelope. Mobile client already received and executed the action via `client_task` during delegation.

### 4. Imports to clean up

- `agent-runner.ts`: remove `ToolMessage`, `ToolHandlerResult`
- `message.service.ts`: remove `runServerAction`; grep and remove `MessageActionExecutor` import if unused after branch removal

### 5. Test updates

- Remove all ToolMessage-as-last-message tests.
- Add test: `[AIMessage(tool_calls), ToolMessage(...), AIMessage('Done')]` → `kind: 'text', content: 'Done'`.
- Remove message.service tests mocking `runAgent` returning `kind: 'action'`.
- Remove `findLatestActionMessageByParentIdMock` usage from message.service tests.

## Risks / Trade-offs

- **[Risk] WebSocket clients expecting `type: 'action'` in MESSAGE_COMPLETED** → **Mitigation:** Client already handles action via `client_task` during delegation; final response is conversational text. Verify manually with "open the camera".
- **[Risk] conversation-summary receives text instead of action for tool turns** → **Mitigation:** Summary job still runs; broker-persisted action rows remain in DB for history. Summary service reads action rows independently when building context.

## Migration Plan

1. Remove dead code from `agent-runner.ts` and `message.service.ts`.
2. Update tests.
3. Run `npm test` — verify 90% coverage gate.
4. Grep verification: no `ToolMessage`, `parseToolHandlerResult`, `runServerAction` in `src/`; no `findLatestActionMessageByParentId` in `src/services/`.
5. No deployment migration — behavior change is removing unreachable paths.

## Open Questions

- None.
