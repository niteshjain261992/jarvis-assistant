# Tasks

Source files in scope (closed-world): `src/services/message.service.ts`, `tests/services/message.service.test.ts`.

## 1. Pipeline error logging helper

- [x] 1.1 Add a private `PipelineStage` type and `logPipelineFailure(err, stage, ctx)` helper in `src/services/message.service.ts` that calls `logger.error` with `{ err, pipelineStage, conversationId?, userMessageId?, assistantMessageId?, intent? }`
- [x] 1.2 Add a private `logPipelineWarn(stage, ctx)` helper (or inline `logger.warn`) for expected failed-result paths with `{ pipelineStage, conversationId, intent?, errorDetails }`

## 2. createMessage failure paths

- [x] 2.1 Wrap `getOrCreateActiveConversation` and dual `insertMessage` calls: on throw, call `logPipelineFailure` with `conversationResolve` or `messageInsert` (include IDs when assigned), then re-throw
- [x] 2.2 In the outer `catch`, call `logPipelineFailure` with `pipelineStage: 'pipeline'` and include `intent` when classification completed; keep existing failed assistant update and re-throw behavior
- [x] 2.3 In the nested `.catch` when marking assistant failed throws, call `logPipelineFailure` with `pipelineStage: 'markFailed'`
- [x] 2.4 In the image intent branch, emit `logger.warn` with `pipelineStage: 'imageBranch'`, `intent: 'image'`, and `errorDetails` before returning the failed result

## 3. Tests

- [x] 3.1 Add `logger.error` and `logger.warn` mock references in `tests/services/message.service.test.ts`
- [x] 3.2 Assert `logger.error` with `pipelineStage: 'pipeline'` in the LLM error rethrow test and non-Error throw test
- [x] 3.3 Assert `logger.error` with `pipelineStage: 'markFailed'` in the mark-failed-also-fails test
- [x] 3.4 Assert `logger.warn` with `pipelineStage: 'imageBranch'` in the image intent test
- [x] 3.5 Add test: conversation resolve throws → assert `logger.error` with `pipelineStage: 'conversationResolve'` and error re-thrown
- [x] 3.6 Run `npm test` and confirm branch coverage remains ≥ 90%
