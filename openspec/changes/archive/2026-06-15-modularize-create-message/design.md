# Design: modularize-create-message

## Context

`message.service.ts` exports `createMessage` as the sole public API. Internally it already has helpers (`getOrCreateActiveConversation`, `scheduleConversationSummary`, `runServerAction`, `logPipelineFailure`) but the main function inlines ~150 lines of branch logic and maintains two try/catch blocks (pre-pipeline setup vs intent pipeline).

Engineering law: services stay free of Express types; logging via shared pino `logger`; tests must pass at ≥ 90% coverage; no behavioral change to the `POST /messages` contract.

## Goals / Non-Goals

**Goals:**

- `createMessage` reads as a short orchestrator (~30–50 lines)
- One function per intent branch with a shared context object
- Single error-recovery path for pipeline failures (log → mark assistant failed → rethrow)
- Document modular service conventions in `service-structure` spec + engineering doc
- Preserve all existing debug/error/warn logging and test assertions

**Non-Goals:**

- Splitting into multiple files or new modules (stay in `message.service.ts` for v1)
- Changing public exports or adding new exported functions
- Refactoring `ollama.service.ts`, repositories, or controller
- Introducing classes, DI frameworks, or pipeline abstractions

## Decisions

### 1. Shared `PipelineContext` type

Bundle request-scoped state passed to branch handlers:

```typescript
interface PipelineContext {
  prompt: string;
  conversation: ConversationDocument;
  userMessageId: string;
  assistantMessageId: string;
  userSequence: number;
  assistantSequence: number;
  classifiedIntent?: MessageIntent;
}
```

**Alternative considered:** pass positional args — rejected; context object reduces parameter sprawl across 4+ functions.

### 2. Function decomposition

| Function | Responsibility |
|----------|----------------|
| `preparePipelineContext(prompt)` | Resolve conversation, insert user + assistant rows, return `PipelineContext`; throws on setup failure |
| `handleConversationBranch(ctx)` | Recent messages → LLM → update assistant → advance sequence → summary → return result |
| `handleActionBranch(ctx)` | Interpret command → catalog lookup → optional server action → update → summary → return result |
| `handleImageBranch(ctx)` | Warn log → mark failed → return failed result (no throw) |
| `withPipelineErrorRecovery(ctx, fn)` | Run async branch work; on throw: log pipeline failure, mark assistant failed (with markFailed log), rethrow |
| `createMessage(prompt)` | `preparePipelineContext` → classify intent → dispatch branch via `withPipelineErrorRecovery` or direct call for image |

### 3. Single error-recovery wrapper

Replace the outer intent try/catch and consolidate pre-pipeline error logging:

- **`preparePipelineContext`**: keeps its own try/catch for `conversationResolve` / `messageInsert` stages (failures before context exists — cannot use full `PipelineContext` recovery)
- **`withPipelineErrorRecovery`**: wraps conversation and action branch execution; handles `pipeline` and `markFailed` logging + assistant row update

Image branch runs outside the error wrapper (returns failed result, does not throw).

```typescript
async function withPipelineErrorRecovery(
  ctx: PipelineContext,
  fn: () => Promise<CreateMessageResult>,
): Promise<CreateMessageResult> {
  try {
    return await fn();
  } catch (err) {
    logPipelineFailure(err, 'pipeline', { ...ctxIds, intent: ctx.classifiedIntent });
    await markAssistantFailed(ctx, err).catch((markErr) => {
      logPipelineFailure(markErr, 'markFailed', { ...ctxIds, intent: ctx.classifiedIntent });
    });
    throw err;
  }
}
```

Extract `markAssistantFailed(ctx, err)` to deduplicate errorDetails formatting.

**Alternative considered:** one try/catch around entire `createMessage` including setup — rejected; pre-pipeline failures lack assistant row and need different `pipelineStage` values.

### 4. Orchestrator shape

```typescript
export async function createMessage(prompt: string): Promise<CreateMessageResult> {
  const ctx = await preparePipelineContext(prompt);
  ctx.classifiedIntent = await classifyIntent(prompt);
  logger.debug({ conversationId: ctx.conversation._id, intent: ctx.classifiedIntent }, 'Intent classified');

  switch (ctx.classifiedIntent) {
    case 'conversation':
      return withPipelineErrorRecovery(ctx, () => handleConversationBranch(ctx));
    case 'action':
      return withPipelineErrorRecovery(ctx, () => handleActionBranch(ctx));
    case 'image':
      return handleImageBranch(ctx);
  }
}
```

Use `switch` over nested `if` for clarity. Each branch handler owns its debug logs (`Pipeline branch entered`, `Pipeline completed`).

### 5. Size targets (soft conventions for service-structure spec)

- Public orchestrator function: ≤ 50 lines
- Private branch handler: ≤ 60 lines
- When a function exceeds ~80 lines, extract a sub-step

### 6. Documentation updates

- Add `openspec/engineering/service-structure.md` — binding law mirroring `testing.md` / `config.md`
- Add `openspec/specs/service-structure/spec.md` via delta (requirements enforceable in review)
- Update `openspec/codebase/interfaces/message.md` with internal function list
- Update `openspec/codebase/map.md` one-line description if needed

### 7. Testing

- No new behavior → existing tests in `tests/services/message.service.test.ts` should pass with minimal or zero changes
- Run `npm test`; coverage must remain ≥ 90%
- Do not export branch handlers for separate test files in v1 (test via `createMessage` integration tests as today)

## Risks / Trade-offs

- **[Refactor-only diff looks large]** → Pure move/refactor; no logic changes; tests guard behavior
- **[Over-abstraction]** → Keep helpers private in same file; no new utility module
- **[Switch exhaustiveness]** → TypeScript narrows `MessageIntent`; default unreachable

## Migration Plan

Deploy as internal refactor. No config, API, or database migration.

## Open Questions

None for v1.
