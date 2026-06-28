## Context

`openspec/codebase/map.md` is the as-is topography contract: "If this disagrees with code, this file is the bug." After agent-runner, agent-tools, and client-task-broker landed, the map and interface layer were not updated in the same commits. Behavioral specs in `openspec/specs/` are mostly current; the codebase mirror is not.

## Goals / Non-Goals

**Goals:**

- Bring `map.md` to full parity with `src/**/*.ts`
- Correct wrong signatures and exports in existing interface docs
- Add interface docs for modules that exist in code but have no mirror entry
- Close small gaps in main specs (`ACTION_REQUEST`, `runAgent` context param)

**Non-Goals:**

- Changing application behavior or `src/` code
- Rewriting behavioral specs that already match code
- Adding interface docs for `node_modules` or test files

## Decisions

### 1. Four new interface docs, not one mega-doc

**Choice:** Separate `agent-runner.md`, `agent-tools.md`, `client-task-broker.md`, `message-envelope.md` following existing `interfaces/*.md` conventions.

**Rationale:** Matches one-doc-per-module pattern (`message.md`, `websocket.md`, etc.) and keeps each file scannable.

### 2. `ClientTaskPersistenceContext` documented in broker, re-exported in tools

**Choice:** Define the type in `client-task-broker.md`; note re-export from `agent/tools/types.ts` and `agent/tools/index.ts`.

**Rationale:** Type is authored in `client-task-broker.ts`; tools only re-export.

### 3. `CONVERSATION_SYSTEM_PROMPT` moves to agent-runner interface doc

**Choice:** Remove from `ollama.md` exports; document in `agent-runner.md`.

**Rationale:** Symbol lives in `src/agent/agent-runner.ts`, not `ollama.service.ts`.

### 4. Delta specs only where main specs are incomplete

**Choice:** Small MODIFIED/ADDED deltas for `api-response` and `agent-runner`; no delta for modules already fully specced.

**Rationale:** Avoid redundant spec churn; codebase mirror is the primary deliverable.

## Risks / Trade-offs

- **Docs drift again** → Mitigated by map.md rule and closed-world file list in `tasks.md`
- **Duplicate content between specs and interfaces** → Acceptable; specs are normative requirements, interfaces are as-is API reference
