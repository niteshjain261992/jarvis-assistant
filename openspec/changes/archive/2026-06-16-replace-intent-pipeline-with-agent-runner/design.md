## Context

`message.service.ts` orchestrates: resolve conversation → dual insert → `classifyIntent` → switch on `conversation` | `action` | `image`. Conversation uses `generateConversationResponse`; action uses `interpretCommand` + `getCommandCatalogEntry`; image returns a hard-coded failure.

`runAgent` in `src/agent/agent-runner.ts` already returns `{ kind: 'text' | 'action' | 'clarify' }` using LangChain `createAgent`, tools from `@/agent/tools/index.js`, and shared persona/context filtering from `ollama.service.ts`. It was built behind an unused `AGENT_RUNTIME` flag that this change removes.

## Goals / Non-Goals

**Goals:**

- Wire `createMessage` → `runAgentTurn` → `runAgent` as the sole pipeline path.
- Preserve existing persistence semantics for text and action outcomes (including `runServerAction` for server executor).
- Treat `clarify` as a normal completed text turn.
- Delete dead legacy LLM functions and specs with zero remaining references.
- Keep service-structure constraints: orchestrator + private handlers, typed `PipelineContext`, centralized error recovery.

**Non-Goals:**

- Changing WebSocket envelope format or client protocol.
- Adding new tools or modifying agent-runner internals.
- Reintroducing image generation/search as a pipeline branch.
- Manual WebSocket verification in CI (documented as pre-merge gate only).

## Decisions

### 1. Direct cutover, no feature flag

**Choice:** Remove `AGENT_RUNTIME` and legacy handlers in one change.

**Rationale:** User requirement; dual paths increase test matrix and delay full agent validation. Rollback is git revert, not runtime toggle.

**Alternative considered:** Keep `AGENT_RUNTIME` until manual QA passes — rejected per spec.

### 2. Single branch handler `runAgentTurn`

**Choice:** One private function (~50–60 lines) replacing three branch handlers.

**Rationale:** Matches service-structure pattern; agent runner already multiplexes text vs tool internally.

**Flow:**

1. Fetch last 10 prior messages via `findRecentMessagesByConversationId(conversationId, 10, userSequence)`.
2. `runAgent({ prompt, context: recentMessages, summary: conversation.summary })`.
3. Switch on `result.kind`:
   - `text` / `clarify` → assistant `type: 'text'`, `content`, `status: 'completed'`.
   - `action` → assistant `type: 'action'`, fields from result; call existing `runServerAction` when `actionExecutor === 'server'`.
4. Update `lastSequenceNumber`, `scheduleConversationSummary`, return `CreateMessageResult`.

### 3. Action metadata from agent tools, not command catalog

**Choice:** Stop calling `getCommandCatalogEntry` in the message pipeline; use `actionName`, `actionExecutor`, `actionPayload` from `AgentRunResult`.

**Rationale:** Agent tools define local `commandName`, `executor`, `payload` per `agent-tools` spec. Catalog's `buildCommandSystemPrompt` becomes unused.

**Note:** `getCommandCatalogEntry` may remain in catalog module for other uses but is removed from message.service imports.

### 4. Ollama service trim (grep-gated)

**Choice:** Delete `classifyIntent`, `interpretCommand`, `generateConversationResponse`, and related constants after confirming no imports.

**Keep:** `CONVERSATION_SYSTEM_PROMPT`, `filterCompletedContextMessages`, `summarizeText`, shared `callOllama` if still used by summarize.

**Rationale:** Agent runner owns conversation + tool selection; summary jobs still need `summarizeText`.

### 5. Logging adjustments

**Choice:** Replace intent/branch debug logs with agent-turn logs (`agentKind`, `contextMessageCount`). Remove image-branch warn path.

**Rationale:** Aligns with `message-pipeline-logging` delta; LLM ops inside agent runner are LangChain calls (not individual `llmOperation` tags unless extended later — out of scope).

### 6. Image intent removal

**Choice:** No image branch; ambiguous image requests handled by agent as text or clarify.

**Rationale:** Image branch only returned `Image intent not supported` failure; agent path is strictly better UX.

## Risks / Trade-offs

- **[Agent mis-routes commands]** → Mitigated by existing agent-runner tests + manual WebSocket QA checklist before merge.
- **[No runtime fallback]** → Mitigated by thorough test rewrite and explicit pre-merge manual prompts.
- **[LangChain latency vs two lightweight calls]** → Acceptable trade-off for unified reasoning; monitor in production.
- **[Catalog / tool drift]** → Tools are source of truth for actions; catalog spec narrowed to avoid implying prompt generation.

## Migration Plan

1. Implement `runAgentTurn` and switch `createMessage` orchestrator.
2. Remove legacy functions and dead imports; remove `AGENT_RUNTIME`.
3. Update tests and specs; run full suite + eslint + grep verification.
4. **Pre-merge manual gate:** WebSocket prompts — "open the camera", "what is my name", "turn off lights", ambiguous clarify trigger — all must behave correctly before merge.

**Rollback:** Revert commit; no env toggle.

## Open Questions

- None — requirements are explicit in the change request.
