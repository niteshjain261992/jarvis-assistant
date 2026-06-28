## Context

The `POST /messages` pipeline classifies intent, then on `conversation` loads message history and calls `generateConversationResponse`. Today:

- `findMessagesByConversationId` sorts ascending and limits to 20 — returning the **earliest** messages, not the most recent
- `conversation.summary` (maintained by the Agenda summary worker) is never read in the request path
- The current user message may appear twice in the Ollama prompt (once in fetched context, once appended) — pre-existing behavior we tighten by excluding the in-flight exchange from history

Rolling summaries were added in `add-conversation-summary`; this change completes the intended memory model: **summary for long-term context + last 10 messages for recency**.

## Goals / Non-Goals

**Goals:**

- Fetch the 10 most recent messages **before** the current user turn
- Pass `conversation.summary` into `generateConversationResponse` when present
- Assemble a clear prompt: summary block → recent history → current user prompt
- Repository helper for recent-message queries with `beforeSequenceNumber` filter
- Tests covering repository ordering, prompt assembly, and pipeline wiring

**Non-Goals:**

- Changing intent classification (`classifyIntent` still uses prompt only)
- Changing action or image branches
- Tunable limit via env/config (hardcode 10 for v1)
- Re-fetching conversation from DB (use `summary` from conversation already loaded in `getOrCreateActiveConversation`)

## Decisions

### 1. New repository function `findRecentMessagesByConversationId`

**Choice:** Add `findRecentMessagesByConversationId(conversationId, limit = 10, beforeSequenceNumber?: number)`.

**Rationale:** Keeps `findMessagesByConversationId` behavior stable for existing tests; makes "recent" semantics explicit.

**Query:** `MessageModel.find({ conversationId, ...(beforeSequenceNumber && { sequenceNumber: { $lt: beforeSequenceNumber } }) }).sort({ sequenceNumber: -1 }).limit(limit)`, then reverse array for chronological prompt order.

**Alternatives considered:**
- Change default on `findMessagesByConversationId` — risks subtle breakage; name does not imply "recent"
- Load all messages and slice in service — does not scale

### 2. Extend `generateConversationResponse` with optional `summary`

**Choice:** `generateConversationResponse(messages, prompt, summary?: string)` — minimal signature change.

**Prompt assembly:**

```
[if summary]
Previous conversation summary:
{summary}

[if history]
{role: content lines}

user: {prompt}
assistant:
```

If neither summary nor history, prompt is just `{prompt}` (unchanged first-exchange behavior).

**Alternatives considered:**
- Options object — clearer but wider refactor for one new field

### 3. Exclude in-flight exchange from history

**Choice:** Pass `beforeSequenceNumber: userSequence` from `message.service.ts` so the just-inserted user/assistant rows are not in the history block.

**Rationale:** Avoids duplicating the current prompt in history; assistant `processing` row was already filtered by status.

### 4. Debug observability

**Choice:** Log `contextMessageCount` and `hasSummary: boolean` at debug in `message.service.ts` when entering the conversation branch (alongside existing branch log).

## Risks / Trade-offs

- **[Risk] Summary stale vs. last 10 messages overlap** → Acceptable; summary is rolling and messages provide recency. Worker updates summary after each exchange.
- **[Risk] Very long individual messages still large** → Out of scope; limit is message count not tokens.
- **[Risk] First exchange before any summary job completes** → Works with empty summary and empty history (prompt-only), same as today.

## Migration Plan

Deploy as a single release. No schema migration. No API changes. Rollback: revert service/repository/ollama changes.

## Open Questions

None for v1.
