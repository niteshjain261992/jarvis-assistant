## Why

The RAG **write path** already keeps user identity and location facts embedded in the `user_context` Qdrant collection, but nothing consumes them. The agent still has no semantic recall: to know where the user is, it must call a tool or be handed a static full-profile dump. This change adds the missing **read path** so that before each agent turn, the user's prompt is embedded, the most relevant user-context facts are retrieved (filtered to the current user), and injected into the agent system prompt. After this, "what's the weather outside?" reaches the LLM already knowing the user's location — no tool call, no static profile dump.

## What Changes

- Add a `retrieveUserContext(prompt, userId)` function to `user-context.service.ts` that embeds the prompt with `embedText` and runs a raw `@qdrant/js-client-rest` `search` against `user_context`, limited to 3 results and filtered by a **mandatory** `userId` payload filter. It returns the matched fact sentences joined by newlines.
- Store the fact sentence on the point payload (`payload.text`) in the existing `upsertUserIdentity` / `upsertUserLocation` write functions, so retrieval can return the sentence directly without re-deriving it. Point ids and overwrite semantics are unchanged.
- Make `buildAgentSystemPrompt` async and add a `userContext` parameter; when non-empty it injects a labeled `Known information about the user:` section placed before the summary section, and omits the section entirely when empty.
- Thread `userId` into `runAgent`: retrieve context (non-fatal) before constructing the agent and build the system prompt from the resolved string.
- Resolve the single user per turn in `runAgentTurn` via `findSingleUser` and pass `user?._id ?? ''` into `runAgent`; an empty `userId` short-circuits retrieval to `''` so a missing user never crashes the turn.
- Retrieval is **non-fatal** end to end: embed/search failures are caught, logged, and degrade to no injected context rather than failing the turn.
- **Non-goals (deferred):** no other write-path changes (no embed-on-write, geocoding, or startup backfill changes beyond `payload.text`); no preference embedding/retrieval; no time-bucket/time-influenced retrieval; no retriever-as-tool (retrieval is an always-on pre-step, not an LLM decision); no multi-user auth (single user via `findSingleUser`, but the `userId` filter is mandatory so multi-user works later).

## Capabilities

### New Capabilities

<!-- None: this change extends two existing capabilities. -->

### Modified Capabilities

- `user-context-rag`: Add the retrieval requirements — embed-the-prompt + Qdrant `search` with `limit 3` and a mandatory `userId` payload filter; empty/falsy `userId` returns `''` without searching; empty results return `''`; non-fatal (failures log and return `''`); retrieved text injected as a labeled system-prompt section (empty context omits the section); write path stores the fact sentence in `payload.text` so retrieval can return it. The "Retrieval deferred" requirement is superseded.
- `message-pipeline`: Update the agent-turn requirement — the user is resolved per turn via `findSingleUser`, `userId` is threaded into `runAgent`, user context is retrieved and injected before the LLM call, and retrieval failure degrades to no-context rather than failing the turn.

## Impact

- **Modified code:** `src/services/user-context.service.ts` (add `retrieveUserContext`, add `payload.text` to both upserts), `src/agent/agent-runner.ts` (async `buildAgentSystemPrompt` + `userContext`; retrieve + thread `userId` in `runAgent`), `src/services/message.service.ts` (resolve user, pass `userId`).
- **Specs:** modified `user-context-rag` and `message-pipeline`.
- **Tests:** modified `tests/services/user-context.service.test.ts`, `tests/agent/agent-runner.test.ts`, `tests/services/message.service.test.ts`. All existing `runAgent` tests must pass the new `userId` field and await the now-async `buildAgentSystemPrompt`. Coverage must stay above 90%.
- **No new dependencies, env vars, or infrastructure.** Retrieval reuses the existing Qdrant client and `embedText`.
- **Backfill note:** existing points lack `payload.text` until re-embedded; acceptable because the startup backfill re-embeds the seeded user on boot.
