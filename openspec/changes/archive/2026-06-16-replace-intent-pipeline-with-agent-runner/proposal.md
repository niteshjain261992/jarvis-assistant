## Why

The live message pipeline still runs a two-call legacy flow (`classifyIntent` → branch-specific handlers including `interpretCommand`), while a tested LangGraph agent runner (`runAgent`) already unifies conversation and tool-calling in one step. Keeping both paths adds latency, duplicated prompt logic, and drift risk. This change completes the migration with a direct cutover — no feature flag — so every WebSocket prompt goes through the agent runner.

## What Changes

- **BREAKING**: Remove intent classification and the three branch handlers (`handleConversationBranch`, `handleActionBranch`, `handleImageBranch`) from `message.service.ts`; replace with a single `runAgentTurn` handler calling `runAgent`.
- Map `AgentRunResult` kinds (`text`, `action`, `clarify`) onto persisted assistant rows; `clarify` persists as `type: 'text'`, `status: 'completed'` (not a new document type, not a failure).
- Remove from `ollama.service.ts`: `classifyIntent`, `MessageIntent`, `parseIntent`, `INTENT_SYSTEM_PROMPT`, `interpretCommand`, `generateConversationResponse` (if unreferenced). Keep `CONVERSATION_SYSTEM_PROMPT`, `filterCompletedContextMessages`, and `summarizeText` used by the agent runner and summary jobs.
- Remove `buildCommandSystemPrompt` from `command-catalog.ts` if nothing imports it after cutover.
- Remove `AGENT_RUNTIME` env var (no dual pipeline; one path only).
- Archive the `command-interpretation` capability spec (superseded by agent-driven tool selection).
- Update `message-pipeline`, `message-pipeline-logging`, `command-catalog`, and `app-config` specs; update `openspec/engineering/service-structure.md` reference table.
- Rewrite `tests/services/message.service.test.ts` for `runAgentTurn`; remove `classifyIntent` / `interpretCommand` blocks from `tests/services/ollama.service.test.ts`.

## Capabilities

### New Capabilities

_(none — agent runner capability already exists in `openspec/specs/agent-runner/spec.md`)_

### Modified Capabilities

- `message-pipeline`: Replace intent classification + three branches with single agent-driven response requirement; update modular service structure requirement to `runAgentTurn`.
- `message-pipeline-logging`: Replace intent/branch logging with agent-turn logging; update LLM operation list.
- `command-catalog`: Catalog no longer drives Ollama interpreter prompt; retain catalog for legacy metadata lookup only if still used, or narrow purpose to executor/payload reference.
- `app-config`: Remove `AGENT_RUNTIME` requirement.

### Removed Capabilities

- `command-interpretation`: Entire capability archived — `interpretCommand` + catalog-driven command parser no longer exist in the pipeline.

## Impact

- **Code**: `src/services/message.service.ts`, `src/services/ollama.service.ts`, `src/config/command-catalog.ts`, `src/config/env.ts`, `.env.example`
- **Tests**: `tests/services/message.service.test.ts`, `tests/services/ollama.service.test.ts`, `tests/config/env.test.ts`, possibly `tests/config/command-catalog.test.ts`
- **Specs / docs**: `openspec/specs/message-pipeline/spec.md`, `openspec/specs/command-interpretation/` (archive), `openspec/engineering/service-structure.md`, `openspec/codebase/interfaces/ollama.md`, `openspec/codebase/interfaces/message.md`
- **API**: WebSocket response shape unchanged (`MESSAGE_COMPLETED` with `text` or `action`); clarify responses appear as completed `text`. Image intent path removed (no dedicated branch).
- **Dependencies**: No new packages; production path now depends on existing LangGraph agent runner.
