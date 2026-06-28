# Design: add-message-pipeline-logging

## Context

The app uses a shared pino `logger` (`src/utils/logger.ts`) with level from `env.LOG_LEVEL` (default `info`). The message pipeline already logs errors (summary enqueue failure, summary worker failure) and one Ollama debug passthrough for unknown commands. There is no request-scoped trace of pipeline progression.

## Goals / Non-Goals

**Goals:**

- Emit structured `debug` logs at each meaningful pipeline checkpoint
- Include `conversationId` on every log after conversation resolution for correlation
- Log LLM operations with `llmOperation` label and `durationMs`
- Log intent, branch, action name, summary enqueue, and summary persistence

**Non-Goals:**

- Logging full prompts or model responses (privacy/size); log `promptLength` only
- New dependencies (request IDs middleware, OpenTelemetry)
- Changing default `LOG_LEVEL` from `info`
- HTTP access logging (Express middleware)

## Decisions

### 1. Log level: `debug` for pipeline trace, `info` for completion summary

Pipeline step logs use `logger.debug` so production (`LOG_LEVEL=info`) stays quiet. Optionally log a single `logger.info` on successful `POST /messages` completion with `conversationId`, `type`, `status` for high-level visibility.

**Alternative considered:** all `info` — too noisy in production.

### 2. Structured field conventions

| Field | When |
|-------|------|
| `conversationId` | After conversation resolved |
| `userMessageId`, `assistantMessageId` | After dual insert |
| `intent` | After `classifyIntent` |
| `llmOperation` | `classifyIntent`, `generateConversationResponse`, `interpretCommand`, `summarizeText` |
| `durationMs` | After each Ollama call |
| `branch` | `conversation` \| `action` \| `image` |
| `actionName`, `actionExecutor` | Action branch |
| `summaryJob` | `enqueued` \| `persisted` |
| `promptLength` | Request accepted (not full prompt) |
| `status` | Final pipeline outcome |

### 3. Where to log

```
message.controller  → debug: request accepted (promptLength)
message.service     → debug: conversation resolved/created, messages inserted,
                      intent classified, branch entered, pipeline completed/failed
ollama.service      → debug: LLM call start + complete (operation, durationMs)
conversation-summary → debug: job enqueued; debug: summary persisted (rolling vs first)
```

Wrap Ollama timing inside `callOllama` so all four operations get duration automatically.

### 4. Optional helper: `logPipelineEvent`

Skip a new utility — inline `logger.debug({ ... }, 'message')` at each site to minimize abstraction. Messages use short present-tense phrases: `"Intent classified"`, `"LLM call completed"`, `"Summary job enqueued"`.

### 5. Testing

- Existing tests already mock `logger`; extend assertions for key `debug` calls in message.service and conversation-summary tests
- Ollama tests: verify debug log on successful call (optional, if mock logger injected)

## Risks / Trade-offs

- [Log volume in debug mode] → Acceptable for local dev; document `LOG_LEVEL=debug`
- [Test brittleness] → Assert log message substring + key fields, not every call order
- [Missing correlation if conversation create fails mid-flight] → Log after IDs assigned

## Migration Plan

Deploy additive logging only. No config changes required; developers set `LOG_LEVEL=debug` locally.

## Open Questions

None for v1.
