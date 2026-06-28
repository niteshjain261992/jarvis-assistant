## Context

`classifyIntent` in `src/services/ollama.service.ts` uses a one-line `INTENT_SYSTEM_PROMPT` and `parseIntent` to map Ollama output to `conversation | action | image`. The pipeline branches on this result; only the classifier instructions change.

## Goals / Non-Goals

**Goals:**

- Replace `INTENT_SYSTEM_PROMPT` with the user-provided structured prompt verbatim (definitions + examples per intent)
- Preserve `parseIntent`, temperature 0, 10s timeout, error handling, and debug logging
- Test that Ollama receives the new system prompt

**Non-Goals:**

- Changing `parseIntent` logic or adding JSON output mode
- Adding few-shot examples in the user `prompt` field (system prompt only)
- Tuning temperature or timeout

## Decisions

### 1. Store prompt as a multi-line template literal

**Choice:** Use a template literal array joined with `\n` (or single template string) matching the user's prompt text exactly.

**Rationale:** Keeps readability; same pattern as `CONVERSATION_SYSTEM_PROMPT` and `SUMMARY_SYSTEM_PROMPT`.

**Alternatives considered:**
- External config file — unnecessary for a stable prompt

### 2. No change to `parseIntent`

**Choice:** Keep substring matching (`includes('action')`, etc.) on normalized output.

**Rationale:** New prompt still requires single-word response; existing parser handles quotes/whitespace via `stripSurroundingQuotes`.

### 3. Test via fetch body assertion

**Choice:** Extend existing `classifyIntent` test to assert `body.system` contains key phrases (`intent classifier`, `conversation:`, `action:`, `image:`).

## Risks / Trade-offs

- **[Risk] Longer system prompt increases token use** → Acceptable; intent step is small and infrequent per request.
- **[Risk] Model still returns extra text** → Mitigated by existing `parseIntent` normalization; prompt explicitly says single word.

## Migration Plan

Deploy as a single release. No migration. Rollback: revert `INTENT_SYSTEM_PROMPT` constant.

## Open Questions

None.
