## Context

After client-task delegation, each tool factory (`open-camera.tool.ts`, `play-music.tool.ts`, etc.) returns a `ToolHandlerResult` from its handler:

```ts
{ commandName, executor, payload }
```

That object is serialized into the LangGraph `ToolMessage` content when the ReAct agent completes a tool step. `resolveAgentRunResult` still implements the older pattern: scan backward for an AIMessage with `tool_calls`, look up metadata in the tool registry, then find the matching ToolMessage by `tool_call_id`. This duplicates information already present in the ToolMessage and adds failure modes (registry miss, ID mismatch) that tools no longer need.

## Goals / Non-Goals

**Goals:**

- Resolve `AgentRunResult` from the **last message only** in `result.messages`.
- For `ToolMessage`: parse `ToolHandlerResult` and map to `{ kind: 'action', actionName, actionExecutor, actionPayload }`.
- For `AIMessage`: extract text and return `{ kind: 'text', content }`.
- Remove dead helpers and registry imports from `resolveAgentRunResult`.
- Keep `AgentRunResult` type and downstream message pipeline contract unchanged.

**Non-Goals:**

- Changing tool handler implementations or `ToolHandlerResult` shape.
- Changing ReAct recursion behavior or when the graph stops after a tool call.
- Refactoring `runAgent` or message persistence.

## Decisions

### 1. Last-message dispatch by message type

**Decision:** Branch on `messages.at(-1)`:

| Last message type | Result |
|---|---|
| `ToolMessage` with valid `ToolHandlerResult` | `{ kind: 'action', ... }` |
| `AIMessage` with non-empty text | `{ kind: 'text', content }` |
| Anything else (empty array, unsupported type, parse failure) | `{ kind: 'clarify', content: CLARIFY_FALLBACK }` |

**Rationale:** Tool handlers are the single source of truth for action metadata. The graph's terminal message after a tool invocation is the ToolMessage; conversational turns end on an AIMessage.

**Alternative considered:** Keep scanning for AIMessage + ToolMessage pairs. Rejected — redundant now that every tool embeds full result metadata.

### 2. Map ToolHandlerResult fields directly

**Decision:**

- `actionName` ← `handlerResult.commandName`
- `actionExecutor` ← `handlerResult.executor`
- `actionPayload` ← `handlerResult.payload`

**Rationale:** Matches what registry lookup produced without `getToolMetadataByToolName` / `getToolByCommandName`.

### 3. Remove pairing helpers from agent-runner

**Decision:** Delete `findLatestToolCallMessage` and `findToolMessage`. Keep `parseToolHandlerResult` and `extractTextContent` (still needed).

**Rationale:** No callers remain after simplification.

### 4. Test updates

**Decision:** Replace tests that assert registry lookup failures with tests for invalid/missing ToolMessage content on the last message. Remove tests that only exercise AIMessage `tool_calls` without a trailing ToolMessage as the last message (unless they represent clarify paths where last message is AIMessage with tool_calls only — those become clarify because last message is not a valid ToolMessage or text AIMessage).

**Note:** When messages end with `[AIMessage(tool_calls), ToolMessage(...)]`, last message is ToolMessage → action (same as before). When messages are only `[AIMessage(tool_calls)]` with no ToolMessage, last message is AIMessage with empty text → clarify (same outcome).

## Risks / Trade-offs

- **[Risk] Agent graph ends with AIMessage after tool execution** (model adds a follow-up reply) → last message is text, not action; pipeline gets `{ kind: 'text' }` instead of action. **Mitigation:** Current ReAct config (`recursionLimit: 5`) typically stops after tool; monitor in dev. Out of scope unless product requires action even with follow-up text.
- **[Risk] Malformed ToolMessage** → clarify fallback. **Mitigation:** Same as today; tools must return valid JSON `ToolHandlerResult`.
- **[Risk] Unknown command in ToolMessage** → action returned as-is (no registry validation). **Mitigation:** Only registered tools can run in the graph; invalid `commandName` would indicate a tool bug, not a resolver concern.
