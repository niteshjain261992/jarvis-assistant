# Design: add-conversation-summary

## Context

`ConversationDocument` already has an optional `summary` field and `updateConversation` supports partial `summary` updates. The synchronous `POST /messages` pipeline persists user/assistant message pairs but never writes `summary`. The user wants rolling summaries maintained asynchronously so HTTP latency is unaffected.

MongoDB is already the persistence layer (Mongoose). **Agenda** stores jobs in MongoDB and fits this stack without adding Redis or another broker.

## Goals / Non-Goals

**Goals:**

- Enqueue summary work after each **completed** exchange, before HTTP response
- First exchange: summarize `user: …\nassistant: …` → save `summary`
- Later exchanges: prior `summary` + new exchange → summarize → replace `summary`
- Agenda worker + Ollama summarization; failures logged, never block client

**Non-Goals:**

- Using summary in `generateConversationResponse` context (future enhancement)
- Summarizing failed or image-intent exchanges
- Title generation or conversation archival
- Separate worker process (Agenda runs in the same Node process as the API)

## Decisions

### 1. Job queue: Agenda + MongoDB

Use `agenda` with `mongo` connection string from `env.MONGODB_URI` and database `env.MONGODB_DATABASE`. Collection defaults to `agendaJobs`.

**Alternatives considered:** BullMQ (needs Redis), inline `setImmediate` (no retry/persistence), MongoDB change streams (overkill).

### 2. Trigger point: `message.service.ts` before return

Enqueue from `createMessage()` on each successful `status: 'completed'` return path (conversation + action branches), **after** DB updates and **before** `return`. Use `void enqueue…catch(log)` so enqueue errors never fail the request.

Controller remains unaware of jobs.

**Alternatives considered:** Controller hook (leaks infra into HTTP layer), Mongoose post-save hook (harder to get final assistant text).

### 3. Job payload

```ts
interface UpdateConversationSummaryJobData {
  conversationId: string;
  exchangeText: string; // "user: …\nassistant: …"
}
```

`exchangeText` is built in the service from the user prompt and assistant outcome:

| Branch | assistant line |
|--------|----------------|
| `text` | `content` from model |
| `action` | `actionName` + JSON-stringified payload/result |

### 4. Summary worker logic (`conversation-summary.service.ts`)

```
processSummaryJob({ conversationId, exchangeText }):
  conversation = findConversationById(conversationId)
  if !conversation → log warn, return

  if !conversation.summary:
    newSummary = await summarizeExchange(exchangeText)
  else:
    combined = `Previous summary:\n${conversation.summary}\n\nNew exchange:\n${exchangeText}`
    newSummary = await summarizeExchange(combined)

  updateConversation(conversationId, { summary: newSummary })
```

### 5. Ollama summarization (`summarizeText` in `ollama.service.ts`)

New export: `summarizeText(input: string): Promise<string>`

- System prompt: concise rolling conversation summary, preserve key facts/commands, third person, max ~200 words
- Same `/api/generate` endpoint, temperature 0.2, 15s timeout
- Empty response → `LLM_EMPTY_RESPONSE` (worker catches and logs)

### 6. Module layout

```
src/config/agenda.ts           — createAgenda(), startAgenda(), stopAgenda()
src/jobs/conversation-summary.job.ts — define('update-conversation-summary', handler)
src/services/conversation-summary.service.ts — buildExchangeText, enqueue, processSummaryJob
src/services/ollama.service.ts — summarizeText()
src/server.ts                  — start/stop agenda in lifecycle
```

`enqueueConversationSummary` exported from summary service; message.service imports only that function.

### 7. Testing strategy

- Mock Agenda in message.service tests — assert `enqueueConversationSummary` called on success, not on failure
- Unit test `conversation-summary.service` — first vs rolling paths with mocked Ollama + repository
- Unit test `summarizeText` in ollama.service.test.ts
- Agenda config module: smoke test start/stop with mongodb-memory-server (optional lightweight mock)

## Risks / Trade-offs

- [Concurrent jobs for same conversation] → Agenda `lockLifetime`; v1 accepts last-write-wins (acceptable for personal agent scale)
- [Summary drift / lossy compression] → Rolling re-summary is inherently lossy; acceptable for v1 memory aid
- [Agenda ESM compatibility] → Verify `agenda` works with `"type": "module"`; may need dynamic import or `@agendajs/agenda` if legacy package issues
- [Job enqueue after response timing] → User asked "just before sending response"; enqueue in service before return satisfies this without delaying response body

## Migration Plan

1. Add `agenda` dependency
2. Deploy — existing conversations keep `summary` undefined until first post-deploy exchange
3. No HTTP contract change for clients

## Open Questions

None for v1. Future: feed `summary` into `generateConversationResponse` instead of full message history.
