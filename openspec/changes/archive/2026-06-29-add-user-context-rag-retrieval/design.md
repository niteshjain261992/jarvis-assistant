## Context

The RAG write path (`add-user-context-embedding-write-path`) embeds user identity and location facts into the `user_context` Qdrant collection using the raw `@qdrant/js-client-rest` client and the `embedText` helper from `embedding.service.ts`. Each point is written at a deterministic UUIDv5 id with payload `{ userId, type, logicalId }`. Retrieval was explicitly deferred to this slice.

Today the agent (`src/agent/agent-runner.ts`) has no semantic recall of user facts. `buildAgentSystemPrompt(summary?)` is synchronous and only assembles persona, tool policy, date/time, and an optional summary section. `runAgent` constructs the agent from that prompt. The message pipeline (`src/services/message.service.ts`) drives turns through `runAgentTurn`, which calls `runAgent` with `{ prompt, context, summary }` — it does not resolve or thread any user.

This change wires retrieval into the critical path: embed the prompt, search Qdrant filtered to the current user, and inject the matched facts into the system prompt before the LLM call. The single user is resolved per turn via `userRepository.findSingleUser` (`UserDocument._id: string`).

## Goals / Non-Goals

**Goals:**

- A `retrieveUserContext(prompt, userId)` that mirrors the write path's raw-client + `embedText` style — `getQdrantClient().search(COLLECTION_NAME, { vector, limit: 3, filter, with_payload: true })` with a **mandatory** `userId` payload filter.
- Guard: empty/falsy `userId` returns `''` immediately, without embedding or searching.
- Non-fatal retrieval: any embed/search error logs via `logger.error` and returns `''`.
- Async `buildAgentSystemPrompt(userContext, summary?)` injecting a labeled `Known information about the user:` section before the summary, omitted when context is empty.
- `userId` threaded from `runAgentTurn` → `runAgent` → `retrieveUserContext`.

**Non-Goals (deferred):**

- No other write-path changes (embed-on-write triggers, geocoding, startup backfill) beyond adding `payload.text`.
- No preference embedding/retrieval; no time-bucket / time-influenced retrieval.
- No retriever-as-tool — retrieval is an always-on pre-step, not an LLM decision.
- No multi-user auth — single user via `findSingleUser`, but the `userId` filter is mandatory so multi-user works later.

## Decisions

### Decision: Store the fact sentence on the point payload (`payload.text`) — option (a)

The current write path stores `{ userId, type, logicalId }` but **not** the natural-language sentence. Retrieval needs the sentence to inject into the prompt. Two options were considered:

- **(a) PREFERRED — store `payload.text = sentence` on write.** `upsertUserIdentity` and `upsertUserLocation` already build the sentence (`buildIdentitySentence` / `buildLocationSentence`) immediately before embedding; adding it to the payload is a one-line change per function. Retrieval then reads `result.payload.text` directly — simple, no re-derivation, no coupling to `UserDocument` shape at read time.
- **(b) Re-derive text at read time from the user record using `payload.type`.** Rejected: it couples retrieval to the user model and the sentence builders, requires a Mongo read on the hot path, and duplicates write-path logic.

**Chosen: (a).** Point ids and overwrite semantics stay identical — only the payload gains a `text` field. **Backfill note:** existing points lack `payload.text` until re-embedded; this is acceptable because the startup backfill re-embeds the seeded user on every boot, and a missing `text` simply contributes an empty/absent string to the joined result.

### Decision: Mandatory `userId` payload filter — never an unfiltered search

`retrieveUserContext` SHALL always pass `filter: { must: [{ key: 'userId', match: { value: userId } }] }`. The empty/falsy `userId` guard returns `''` *before* embedding or searching precisely so the code never reaches a search call without a filter. This is the single most important multi-user-safety property: even though there is one user today, an unfiltered search would leak other users' facts the moment a second user exists. A grep for `.search(` must show a `userId` filter on every call.

**Alternative considered:** post-filter results in app code. Rejected — pushes the isolation boundary into application logic where a bug silently leaks data; the Qdrant-side filter is both safer and cheaper (it narrows the candidate set).

### Decision: `limit: 3`, newline-joined sentences

Search returns the top 3 nearest points for the user. With only identity + location points per user today, 3 comfortably covers the whole profile while leaving headroom for future fact types. Retrieved `payload.text` strings are joined with `\n`. Zero matches → `''`.

### Decision: Retrieval is non-fatal, with a belt-and-suspenders guard at the caller

`retrieveUserContext` wraps embed+search in try/catch → `logger.error` → return `''`, so the caller always gets a usable string. Because retrieval sits on the critical turn path, `runAgent` *also* wraps the call in try/catch and falls back to `''`. The turn must still answer when Qdrant is down — retrieval degrades to no injected context, never a thrown error. This mirrors the write path's established non-fatal posture (Mongo is source of truth; Qdrant is a rebuildable derived index).

### Decision: `buildAgentSystemPrompt` becomes async; section ordering

The signature changes to `async buildAgentSystemPrompt(userContext: string, summary?: string)`. The user-context section is placed **before** the summary section so the model sees stable user facts ahead of the rolling conversation summary. Persona, tool policy, and date/time sections are unchanged. When `userContext` is empty the section is omitted entirely. `runAgent` awaits this and constructs `createAgent` from the resolved string (never a promise). Making it async (rather than keeping it sync and awaiting retrieval only in `runAgent`) keeps the prompt-assembly seam uniform and lets tests await one function.

### Decision: Resolve the user in `runAgentTurn`, pass `user?._id ?? ''`

`runAgentTurn` resolves the single user once via `findSingleUser` and passes `user?._id ?? ''` as `input.userId`. A missing user yields `''`, which the `retrieveUserContext` guard turns into no-context — so a missing or unseeded user never crashes the turn. Everything else in `runAgentTurn` (message persistence, sequence numbers, summary scheduling) is unchanged.

## Risks / Trade-offs

- **Stale points without `payload.text`** (pre-existing points written before this change) → retrieval contributes empty text for those until re-embedded. Mitigation: startup backfill re-embeds the seeded user on every boot; the join tolerates missing text.
- **Retrieval latency on the hot path** (one embed + one Qdrant search per turn) → bounded and non-fatal; failure or slowness degrades to no-context, never a failed turn. Mitigation: `limit: 3`, single search, hard non-fatal fallback.
- **Cross-user leakage if the filter is ever dropped** → mitigated by the mandatory filter + the pre-search empty-`userId` guard + a grep check in verification that `.search(` is never called without a `userId` filter.
- **Irrelevant context injected for unrelated prompts** (e.g. "explain recursion") → low impact; the section is labeled and small, and the model is free to ignore it. Acceptable for this slice.
- **Coverage regression** → tests mock `getQdrantClient().search` and `embedText` (no network) and cover the guard, the filter shape, multi-result join, zero results, and the non-fatal path, keeping coverage > 90%.

## Migration Plan

1. Add `payload.text = sentence` to `upsertUserIdentity` / `upsertUserLocation` (ids/overwrite unchanged).
2. Add `retrieveUserContext` to `user-context.service.ts`.
3. Make `buildAgentSystemPrompt` async + `userContext`; retrieve and thread `userId` in `runAgent`.
4. Resolve user + pass `userId` in `runAgentTurn`.
5. Update tests for the new signatures and the new function.
6. Boot with Qdrant + the seeded user already embedded; backfill re-embeds with `payload.text`. Rollback: revert code; the `user_context` collection is derived and unaffected (the extra payload field is ignored by the write path once reverted).

## Open Questions

- None blocking. Relevance tuning (threshold/score cutoff, larger `limit`, preference facts, time-influenced retrieval) is deferred to future slices.
