# Design: add-create-message-error-logging

## Context

`createMessage` in `src/services/message.service.ts` orchestrates conversation resolution (`getOrCreateActiveConversation`), dual message inserts, intent classification, branch-specific LLM/repository work, and async summary scheduling (`scheduleConversationSummary`). Debug logging was added in `add-message-pipeline-logging` for the happy path. The outer `catch` persists `status: 'failed'` on the assistant row and re-throws, but never logs the failure. `scheduleConversationSummary` already logs enqueue failures at `error`. `runServerAction` is synchronous and currently cannot fail.

Engineering constraints: use the shared pino `logger` from `src/utils/logger.ts`; no full prompt logging; preserve existing HTTP error propagation via re-throw.

## Goals / Non-Goals

**Goals:**

- Emit `error` logs for unexpected failures in `createMessage` and internal helpers with request-scoped correlation fields
- Emit `warn` for expected business failures that return without throwing (image intent)
- Use a consistent `pipelineStage` field so operators know where the pipeline stopped
- Extend unit tests to assert logger calls on existing failure-path tests

**Non-Goals:**

- Changing Ollama service error logging (LLM errors surface as thrown `ErrorResponse`; pipeline catch handles them)
- Logging in the controller or global error middleware (already logs unexpected errors)
- Wrapping every repository call in new abstractions
- Logging full prompts, model output, or action payloads

## Decisions

### 1. Log levels: `error` for thrown failures, `warn` for returned failures

| Outcome | Level | Example |
|---------|-------|---------|
| Exception caught and re-thrown | `error` | LLM unavailable, DB insert failure |
| Failed result returned (no throw) | `warn` | Unsupported `image` intent |
| Background summary enqueue failure | `error` (existing) | Already in `scheduleConversationSummary` |

**Alternative considered:** log image intent as `debug` — rejected because it is a user-visible failure worth seeing at `info` default level.

### 2. `pipelineStage` values

| Stage | When |
|-------|------|
| `conversationResolve` | `getOrCreateActiveConversation` throws |
| `messageInsert` | `insertMessage` throws |
| `pipeline` | Outer catch after intent work begins or LLM/repo throws inside `try` |
| `markFailed` | Nested catch when updating assistant row to failed throws |
| `imageBranch` | Image intent returns failed result |

Track `intent` on logs when classification has completed; omit when failure happens before classification.

### 3. Implementation approach: thin wrapper + outer catch logging

1. **Outer catch** — before re-throw, `logger.error({ err, conversationId, userMessageId, assistantMessageId, intent?, pipelineStage: 'pipeline' }, 'Message pipeline failed')`. If `updateMessage` in the recovery path throws, log `{ err, pipelineStage: 'markFailed' }` in the nested `.catch`.

2. **Pre-try failures** — wrap `getOrCreateActiveConversation` and the two `insertMessage` calls in a try/catch that logs at `error` with the appropriate `pipelineStage`, then re-throws. Alternatively, a single helper `logPipelineError(err, ctx)` to avoid duplication.

3. **Image branch** — replace silent return with `logger.warn({ conversationId, intent: 'image', pipelineStage: 'imageBranch', errorDetails }, 'Unsupported image intent')`.

4. **`getOrCreateActiveConversation`** — no separate function-level catch; parent logs with `pipelineStage: 'conversationResolve'`.

5. **`runServerAction`** — no logging added (cannot fail today).

6. **`scheduleConversationSummary`** — no change (already logs enqueue errors).

**Alternative considered:** log only in outer catch — rejected because pre-try repository failures never reach the outer catch's message-ID context without explicit handling.

### 4. Optional helper: inline vs `logPipelineError`

Use a private function in `message.service.ts`:

```typescript
function logPipelineFailure(
  err: unknown,
  stage: PipelineStage,
  ctx: { conversationId?: string; userMessageId?: string; assistantMessageId?: string; intent?: string },
): void {
  logger.error({ err, pipelineStage: stage, ...ctx }, 'Message pipeline failed');
}
```

Keeps field names consistent and avoids copy-paste across pre-try and catch paths.

### 5. Testing

Extend existing failure tests in `tests/services/message.service.test.ts`:

- LLM error rethrow test → assert `logger.error` with `pipelineStage: 'pipeline'`
- Non-Error throw test → assert `logger.error` called
- Mark-failed DB failure test → assert `logger.error` for `markFailed` (and original error still re-thrown)
- Image intent test → assert `logger.warn` with `pipelineStage: 'imageBranch'`
- Add test for conversation resolve failure (mock `findActiveConversation`/`insertConversation` throw) → assert `pipelineStage: 'conversationResolve'`

Mock `logger.error` and `logger.warn` alongside existing `logger.debug` mock.

## Risks / Trade-offs

- **[Duplicate logs with error middleware]** → Acceptable; middleware logs at HTTP layer, service log adds pipeline correlation fields. Service log fires before middleware.
- **[Pre-try wrap adds nesting]** → Mitigated by small `logPipelineFailure` helper
- **[Unknown intent on early failures]** → Omit `intent` field when not yet classified

## Migration Plan

Additive logging only. No config or API changes. Visible immediately at default `LOG_LEVEL=info`.

## Open Questions

None for v1.
