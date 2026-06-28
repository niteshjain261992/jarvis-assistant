# Design

## Context

`POST /command` blocks on Ollama (up to 30s) before returning `ACTION:TARGET`. The mobile app needs an immediate Jarvis voice line while interpretation runs. Engineering law applies: layered architecture, `SuccessResponse`/`ErrorResponse` catalogs, envelope `{ code, message, data }`, services free of Express types, tests with 90% coverage.

## Goals / Non-Goals

**Goals:**

- `POST /acknowledge` returns a short, in-character wait message in `data.text` within ~10s
- Same `prompt` body contract and validation as `/command`
- Reuse existing Ollama config (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`) and error codes

**Non-Goals:**

- Merging ack + command into one endpoint (mobile calls them separately)
- Streaming, chat history, or session state
- Generating the final command in this endpoint

## Decisions

### 1. Separate endpoint: `POST /acknowledge`

Called first by the mobile app; `/command` unchanged. Keeps ack fast and independently cacheable/retryable; mobile can fire both in parallel if desired, but the intended UX is ack first → show text → then command.

### 2. Service: `generateAcknowledgment` in `ollama.service.ts`

Same file as `interpretCommand` — both are single-turn Ollama `/api/generate` calls with different system prompts. Extract a private `callOllama(system, prompt, timeoutMs)` helper to avoid duplicating fetch/error/normalize boilerplate; `interpretCommand` and `generateAcknowledgment` each supply their own system prompt and post-processing.

Ack system prompt (summary): Jarvis persona — intelligent, witty, slightly sarcastic, deeply loyal; address user as "Sir"; one brief sentence acknowledging the specific request and indicating work in progress; prose only, never `ACTION:TARGET`.

### 3. Response shape

`SuccessResponse.ACKNOWLEDGMENT_SENT(res, { text })` → envelope `{ code: "ACKNOWLEDGMENT_SENT", message: "Acknowledgment sent", data: { text } }`. Only `text` is the user-visible Jarvis line; `message` stays the generic catalog string.

### 4. Validation

Duplicate the zod `prompt` schema from `command.controller.ts` in `acknowledge.controller.ts` (trimmed, non-empty, max 500). A shared schema module is premature for two controllers; duplicate is acceptable per minimal-scope rule.

### 5. Timeout and normalization

- Ack timeout: **10s** (`AbortSignal.timeout(10_000)`) — shorter than command's 30s; ack must feel instant
- Post-process: trim, strip surrounding quotes; no uppercase coercion (natural prose)
- Empty model output → `ErrorResponse.LLM_EMPTY_RESPONSE()` (same as command)

### 6. Tests

- Service: mocked `fetch` — success returns trimmed text; network/HTTP/empty failures map to `LLM_*` codes
- HTTP: supertest `POST /acknowledge` — 200 with `data.text` and `ACKNOWLEDGMENT_SENT`; 400 invalid body; 502 when service mocked to fail

## Risks / Trade-offs

- [Two Ollama calls per user action doubles LLM load] → ack uses a short prompt and 10s cap; mobile may parallelize; acceptable for Jarvis UX
- [Persona drift — model may ignore system prompt] → temperature 0.3 (slight warmth for wit, not 0 like command); best-effort, documented in spec
- [Duplicate prompt validation] → extract to shared schema when a third endpoint needs it
