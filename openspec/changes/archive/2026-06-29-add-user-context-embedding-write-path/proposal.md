## Why

Jarvis stores user identity (name, dob, home location) and live location in MongoDB, but the agent has no way to recall this context semantically. Before retrieval-augmented context can be injected into the agent, the system needs a populated vector index. This change stands up the RAG **write path** only: a Qdrant vector store and an Ollama embedding service, with embed-on-write so identity and location facts are continuously kept fresh in Qdrant. Retrieval and LLM injection are deliberately deferred to a later slice so this foundation can be verified in isolation.

## What Changes

- Add Qdrant client + `user_context` collection lifecycle wired into app startup (and shutdown if needed).
- Add an Ollama embedding service using `nomic-embed-text` (768 dimensions), kept free of Qdrant knowledge.
- Add a write-only `user-context.service.ts` exposing `upsertUserIdentity` and `upsertUserLocation`, each writing one point at a **stable point id** (`${userId}:identity`, `${userId}:location`) so re-embedding overwrites rather than appends.
- Trigger location embedding from `processLocationUpdate` after the Mongo update (non-fatal side effect).
- Add a one-time startup backfill that embeds the already-seeded single user (identity + location) immediately.
- Add two env vars: `QDRANT_URL` and `EMBEDDING_MODEL`, both with dev-friendly defaults.
- All embedding/write errors are **non-fatal**: caught, logged, and swallowed — Mongo remains the source of truth and Qdrant is a rebuildable derived index.
- **Non-goals (deferred):** no retrieval / similarity search, no changes to `agent-runner.ts`, `message.service.ts`, or the system prompt, no `userId` threading into `runAgent`, no preference embedding, no time-bucket logic.

## Capabilities

### New Capabilities

- `user-context-rag`: Embed-on-write of user identity and location facts into a Qdrant vector collection with stable point ids, idempotent collection lifecycle, non-fatal write semantics, and startup backfill. Scoped in this change to the write path only; retrieval is explicitly deferred.

### Modified Capabilities

- `app-config`: Add `QDRANT_URL` and `EMBEDDING_MODEL` environment variables with defaults and `.env.example` documentation.

## Impact

- **New dependencies:** `@langchain/qdrant`, `@qdrant/js-client-rest`.
- **Infrastructure:** requires a local Qdrant (`docker run -p 6333:6333 ...`) and the `nomic-embed-text` Ollama model pulled; both documented in design.md. App must still boot when Qdrant is down.
- **New code:** `src/config/qdrant.ts`, `src/services/embedding.service.ts`, `src/services/user-context.service.ts`.
- **Modified code:** `src/config/env.ts`, `src/services/location.service.ts`, `src/server.ts`.
- **Specs:** new `user-context-rag` spec; modified `app-config` spec.
- **Tests:** new tests for qdrant config, embedding service, user-context service; modified location service tests. Coverage must stay above 90%.
