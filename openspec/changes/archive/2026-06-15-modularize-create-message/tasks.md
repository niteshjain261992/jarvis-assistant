# Tasks

Source files in scope (closed-world): `src/services/message.service.ts`, `tests/services/message.service.test.ts`, `openspec/engineering/service-structure.md`, `openspec/codebase/interfaces/message.md`, `openspec/codebase/map.md`.

## 1. Engineering & spec docs

- [x] 1.1 Create `openspec/engineering/service-structure.md` — binding law for orchestrator pattern, branch handlers, centralized error recovery, context objects, and size guidelines (mirror style of `testing.md`)
- [x] 1.2 Update `openspec/codebase/interfaces/message.md` — document internal private functions (`preparePipelineContext`, branch handlers, `withPipelineErrorRecovery`, `markAssistantFailed`)
- [x] 1.3 Update `openspec/codebase/map.md` — refresh `message.service.ts` description to mention modular pipeline structure

## 2. Refactor message.service.ts

- [x] 2.1 Add `PipelineContext` interface and `markAssistantFailed(ctx, err)` helper
- [x] 2.2 Extract `preparePipelineContext(prompt)` — conversation resolve + dual insert + debug logs + pre-pipeline error logging; returns `PipelineContext`
- [x] 2.3 Extract `withPipelineErrorRecovery(ctx, fn)` — single thrown-error recovery path (pipeline + markFailed logging)
- [x] 2.4 Extract `handleConversationBranch(ctx)` — move conversation intent logic unchanged
- [x] 2.5 Extract `handleActionBranch(ctx)` — move action intent logic unchanged
- [x] 2.6 Extract `handleImageBranch(ctx)` — move image intent logic unchanged
- [x] 2.7 Rewrite `createMessage` as thin orchestrator: prepare → classify → switch dispatch; remove duplicate try/catch blocks

## 3. Verification

- [x] 3.1 Run `npm test` — all existing message service tests pass without behavioral changes
- [x] 3.2 Confirm `createMessage` orchestrator is ≤ 50 lines and no function exceeds ~80 lines
- [x] 3.3 Confirm branch coverage remains ≥ 90%
