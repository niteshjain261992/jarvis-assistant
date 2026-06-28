# Proposal: add-acknowledge-endpoint

## Why

The mobile app calls `POST /command` for interpretation, but Ollama can take seconds — during that wait the user sees nothing. Jarvis should speak first with a brief, in-character acknowledgment ("Sir, give me a moment…") before the command result arrives, so the assistant feels responsive and alive.

## What Changes

- New `POST /acknowledge` endpoint: accepts `{ "prompt": string }` (same validation as `/command`), returns HTTP 200 with the unified envelope and `data: { text: string }` — a short Jarvis-style wait message contextual to the prompt
- New `generateAcknowledgment(prompt)` in the service layer via Ollama `/api/generate` with a personality system prompt (witty, loyal, slightly sarcastic; address user as "Sir"; one brief sentence only; no `ACTION:TARGET` output)
- Shorter timeout than command interpretation (10s) so the ack stays snappy; same `LLM_*` error handling pattern
- New `successCodes.ACKNOWLEDGMENT_SENT` and `SuccessResponse.ACKNOWLEDGMENT_SENT` catalog entry
- Mobile flow: call `/acknowledge` first (show `data.text`), then call `/command` (execute `data.command`)

## Capabilities

### New Capabilities

- `command-acknowledgment`: pre-command acknowledgment — fast LLM-generated wait text for the mobile UI before command interpretation

### Modified Capabilities

(none — `/command` behavior unchanged)

## Impact

- **Code**: extend `src/services/ollama.service.ts` (or shared Ollama helper); new controller + route; mount in `app.ts`; `api-response.ts` catalog update
- **Tests**: new service + HTTP tests; update `tests/app.test.ts`; maintain 90% coverage gate
- **Spec plane**: new `openspec/specs/command-acknowledgment/spec.md`; updates to `map.md`, `interfaces/http.md`, `interfaces/ollama.md`, `interfaces/api-response.md`
- **Mobile**: new first-step API call; no breaking changes to existing endpoints
