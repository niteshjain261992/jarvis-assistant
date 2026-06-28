## Why

The conversation branch currently loads up to 20 messages in ascending order (the earliest messages, not the most recent) and ignores the rolling `conversation.summary` field. Long sessions send stale or oversized context to Ollama, increasing latency and cost while missing newer exchanges. With rolling summaries now persisted after each exchange, we can bound LLM input to the last 10 messages plus the summary for accurate, efficient replies.

## What Changes

- Load the **last 10** completed messages for a conversation (most recent by `sequenceNumber`), not the first N rows
- Include `conversation.summary` (when present) in the prompt sent to `generateConversationResponse`
- Update `generateConversationResponse` to assemble summary + recent message history + current user prompt
- Pass summary from the active conversation document in the message pipeline (no extra DB round-trip beyond existing conversation fetch)
- Add tests for recent-message query, prompt assembly with/without summary, and pipeline wiring
- Emit a debug log with `contextMessageCount` when building conversation context (optional observability)

## Capabilities

### New Capabilities

- `conversation-context`: Rules for bounded conversation LLM input — last 10 messages, summary inclusion, and prompt structure

### Modified Capabilities

- `message-pipeline`: Conversation branch SHALL use bounded context (last 10 messages + summary) instead of unbounded/earliest message history

## Impact

- `src/repositories/message.repository.ts` — recent-message query (last N by sequence)
- `src/services/message.service.ts` — pass `summary` and use limit 10
- `src/services/ollama.service.ts` — `generateConversationResponse` accepts summary and builds combined prompt
- `tests/services/ollama.service.test.ts`, `tests/services/message.service.test.ts`, `tests/repositories/message.repository.test.ts`
- `openspec/codebase/interfaces/ollama.md`, `interfaces/message.md` (spec-plane sync in tasks)

No HTTP API contract changes. No new dependencies.
