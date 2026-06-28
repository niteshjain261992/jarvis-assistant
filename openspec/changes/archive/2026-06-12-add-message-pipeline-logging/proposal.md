# Proposal: add-message-pipeline-logging

## Why

The `POST /messages` pipeline spans conversation resolution, dual message inserts, multiple Ollama calls, action routing, and async summary jobs — but only errors and a few warnings are logged today. When debugging intent misclassification, slow LLM calls, or missing summaries, there is no structured trace of what happened during a request.

## What Changes

- Add structured **debug-level** pipeline logs at key steps across the message flow (controller → service → Ollama → summary worker)
- Log events include: request accepted, conversation resolved, messages persisted, intent classified, LLM operation started/completed, branch taken, action resolved, summary job enqueued, summary persisted
- Use consistent structured fields (`conversationId`, `intent`, `llmOperation`, `actionName`, `status`, `durationMs`) — no full prompt/response bodies at default levels
- Keep existing error/warn logs; new logs are additive and gated by `LOG_LEVEL=debug`

## Capabilities

### New Capabilities

- `message-pipeline-logging`: Structured observability for the `POST /messages` synchronous pipeline and related background summary work

### Modified Capabilities

- `message-pipeline`: Pipeline steps SHALL emit debug logs at defined checkpoints
- `conversation-summary`: Summary enqueue and persistence SHALL emit debug logs
- `logging`: Document debug-level pipeline logging conventions

## Impact

- **Code**: `src/controllers/message.controller.ts`, `src/services/message.service.ts`, `src/services/ollama.service.ts`, `src/services/conversation-summary.service.ts` (optional thin helper in `src/utils/` if needed)
- **HTTP**: No API contract change
- **Tests**: Assert logger calls in unit tests (mocked logger); coverage must remain ≥ 90%
- **Ops**: Set `LOG_LEVEL=debug` in development to see pipeline trace
