## Context

Jarvis persists user identity and live location in MongoDB (`src/models/user.model.ts`, single-user model accessed via `userRepository.findSingleUser`). The agent (`src/agent/agent-runner.ts`) has no semantic recall of this data. This change builds the foundation for RAG by standing up the **write path** — a Qdrant vector index continuously fed with embeddings of user facts — without yet wiring retrieval into the agent. The codebase already uses Ollama for generation (`src/services/ollama.service.ts`) and `@langchain/ollama` is a dependency, so Ollama is the natural embedding backend.

Lifecycle and logging conventions are established by `src/config/mongodb.ts` (idempotent `connect`/`disconnect`, `logger` usage) and `src/server.ts` (connect before `listen`, teardown on shutdown). New code mirrors these.

### Infrastructure prerequisites (operator setup, not code)

- Qdrant (local): `docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant`
- Ollama embedding model: `ollama pull nomic-embed-text` (produces 768-dimensional vectors)
- Install deps: `npm install @langchain/qdrant @qdrant/js-client-rest`

## Goals / Non-Goals

**Goals:**

- Idempotent `user_context` collection lifecycle (size 768, cosine) wired into startup.
- Pure Ollama embedding service (`nomic-embed-text`), free of Qdrant imports.
- Write-only `upsertUserIdentity` / `upsertUserLocation` with stable, overwrite-on-rewrite point ids.
- Location write trigger in `processLocationUpdate`; identity covered by startup backfill.
- One-time startup backfill of the seeded single user.
- Non-fatal everywhere: embedding failures never fail the originating operation or block boot.

**Non-Goals (deferred to the retrieval slice):**

- No `retrieveUserContext` / similarity search.
- No changes to `agent-runner.ts`, `buildAgentSystemPrompt`, or `message.service.ts`.
- No `userId` threading into `runAgent`.
- No preference embedding; no time-bucket logic.

## Decisions

### Decision: Raw `@qdrant/js-client-rest` upsert (not LangChain `addDocuments`) for deterministic ids

The write path uses the raw Qdrant client `upsert` with an explicitly supplied point id and a vector produced by the embedding service. **Rationale:** the requirement is deterministic, overwrite-on-rewrite point ids; the LangChain `QdrantVectorStore.addDocuments` wrapper does not cleanly guarantee caller-supplied stable ids across versions, whereas raw `upsert({ id, vector, payload })` does exactly one point per id with overwrite semantics. The `OllamaEmbeddings` instance is still exported from the embedding service (and is the instance a future retrieval `QdrantVectorStore` will use), so the embedding choice stays centralized.

**Alternative considered:** `QdrantVectorStore.addDocuments(docs, { ids })`. Rejected for this slice because behavior around stable ids is wrapper/version-dependent and harder to assert in unit tests; the raw client makes the upsert id directly observable (and assertable as stable across two calls).

### Decision: Logical string id → deterministic UUIDv5 point id

Qdrant only accepts an unsigned integer or a UUID as a point id; the logical ids `${userId}:identity` / `${userId}:location` are neither. We map each logical id to a **deterministic UUIDv5** (`uuidv5(logicalId, NAMESPACE)`) so the same logical fact always resolves to the same Qdrant point id (overwrite, never duplicate). The logical string and `{ userId, type }` are also stored in the point payload for readability and future filtering. `node:crypto` is already used in the codebase; UUIDv5 derivation uses a stable namespace constant.

### Decision: Embedding service is Qdrant-agnostic

`embedding.service.ts` exports the `OllamaEmbeddings` instance (built from `env.OLLAMA_BASE_URL` + `env.EMBEDDING_MODEL`) and an optional single-string embed helper. It imports nothing from Qdrant so it stays independently testable and reusable by the future retrieval slice.

### Decision: Identity trigger is backfill-only this slice

Location has a clear runtime trigger today (`processLocationUpdate`). Identity has no edit flow yet, and the proposal forbids embedding side effects inside `user.repository.ts` (keep the repo persistence-only / Qdrant-free). So runtime identity embedding is **not** wired in this slice — the startup backfill covers the seeded user. When an identity-edit service flow exists, the identity embed trigger will be added there. This keeps the repository layer clean.

### Decision: Non-fatal write path; collection-ensure non-fatal at boot

Every public function in `user-context.service.ts` wraps its work in try/catch → `logger.error` → return. Startup Qdrant init / `ensureCollection` / backfill failures are caught and logged so the app boots even when Qdrant is down (default: warn + continue, not fatal). Mongo is the source of truth; Qdrant is a rebuildable derived index.

### Decision: No Qdrant teardown function

The `@qdrant/js-client-rest` REST client holds no persistent connection requiring cleanup. Rather than add an empty `disconnect`, this is documented here and in `qdrant.ts`; `server.ts` shutdown is left unchanged for Qdrant.

## Risks / Trade-offs

- **Embedding dimension mismatch** (model returns ≠ 768) → collection created with a named `EMBEDDING_DIMENSIONS = 768` constant matching `nomic-embed-text`; mismatch surfaces as a logged, non-fatal upsert error rather than a crash.
- **UUIDv5 namespace drift** → namespace is a hardcoded constant; changing it would orphan existing points. Documented as fixed.
- **Silent data staleness when Qdrant is down** → acceptable: non-fatal by design, backfill on next boot re-syncs the seeded user; Mongo remains authoritative.
- **Coverage regression** (new modules) → unit tests mock the Qdrant client and embedder (no network), covering create/idempotent, sentence building, stable id, skip-on-missing-coords, and non-fatal paths to keep coverage > 90%.

## Migration Plan

1. Install `@langchain/qdrant` and `@qdrant/js-client-rest`.
2. Add `QDRANT_URL` / `EMBEDDING_MODEL` to env schema and `.env.example`.
3. Add `qdrant.ts`, `embedding.service.ts`, `user-context.service.ts`.
4. Wire `ensureCollection` + backfill into `server.ts`; add location trigger to `location.service.ts`.
5. Operator runs Qdrant + pulls `nomic-embed-text`, then boots. Rollback: revert code; the `user_context` collection is derived and can be dropped with no data loss.

## Open Questions

- None blocking. Runtime identity-edit trigger location is deferred until an identity-edit flow exists (noted above).
