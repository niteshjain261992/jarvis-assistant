## 1. Dependencies & configuration

- [x] 1.1 Install `@langchain/qdrant` and `@qdrant/js-client-rest` (`npm install @langchain/qdrant @qdrant/js-client-rest`)
- [x] 1.2 Add `QDRANT_URL` (`z.url().default('http://localhost:6333')`) and `EMBEDDING_MODEL` (`z.string().min(1).default('nomic-embed-text')`) to the zod schema in `src/config/env.ts`
- [x] 1.3 Document `QDRANT_URL` and `EMBEDDING_MODEL` in `.env.example` with default values

## 2. Qdrant config (`src/config/qdrant.ts`)

- [x] 2.1 Add `EMBEDDING_DIMENSIONS = 768` and collection name (`user_context`) named constants
- [x] 2.2 Implement a singleton-style accessor returning a `QdrantClient` pointed at `env.QDRANT_URL` (reused across calls)
- [x] 2.3 Implement idempotent `ensureCollection`: create `user_context` (size 768, cosine) only if absent; no-op + no error when it already exists; use `logger`
- [x] 2.4 Document (comment) that the REST client needs no teardown, so no `disconnect` is added

## 3. Embedding service (`src/services/embedding.service.ts`)

- [x] 3.1 Export an `OllamaEmbeddings` instance built from `env.OLLAMA_BASE_URL` and `env.EMBEDDING_MODEL`
- [x] 3.2 Export an optional single-string embed helper returning a vector
- [x] 3.3 Keep the module free of any Qdrant imports

## 4. User-context write service (`src/services/user-context.service.ts`)

- [x] 4.1 Add logical id builders (`${userId}:identity`, `${userId}:location`) and a deterministic UUIDv5 mapper (stable namespace constant) for Qdrant point ids
- [x] 4.2 Build identity sentence from `name`/`dob`/`homeLocation` (skip undefined, never emit "undefined"); build location sentence from `currentLat`/`currentLon`
- [x] 4.3 Implement `upsertUserIdentity(user)`: embed sentence + raw-client upsert at the identity point id with payload `{ userId, type: 'identity', logicalId }`
- [x] 4.4 Implement `upsertUserLocation(user)`: skip silently when lat/lon missing; otherwise embed + upsert at the location point id with payload `{ userId, type: 'location', logicalId }`
- [x] 4.5 Wrap both functions so all embedding/upsert errors are caught, logged via `logger.error`, and never rethrown

## 5. Write triggers & startup wiring

- [x] 5.1 In `src/services/location.service.ts`, after `updateUser` succeeds in `processLocationUpdate`, call `upsertUserLocation` with the updated location as a non-fatal side effect (must not change the existing return contract or behavior)
- [x] 5.2 In `src/server.ts`, after `connectMongo` and before `server.listen`, initialize Qdrant and call `ensureCollection` (non-fatal: warn + continue if it fails)
- [x] 5.3 In `src/server.ts`, add a startup backfill: load the single user via `findSingleUser` and call `upsertUserIdentity` + `upsertUserLocation` (non-fatal)
- [x] 5.4 Confirm `src/repositories/user.repository.ts` stays free of Qdrant/embedding imports (no embedding side effects in the repo)

## 6. Tests

- [x] 6.1 `tests/config/qdrant.test.ts`: `ensureCollection` creates when absent; idempotent when present; mock the Qdrant client (no real connection)
- [x] 6.2 `tests/services/embedding.service.test.ts`: instance configured with env values; single-string helper returns a vector (mock the embedder)
- [x] 6.3 `tests/services/user-context.service.test.ts`: identity sentence skips undefined and upserts at `${userId}:identity`; location upserts at `${userId}:location`; missing lat/lon → no upsert; same id across two calls (overwrite proof); embed/upsert throw → logged, no rethrow; all mocked, no network
- [x] 6.4 `tests/services/location.service.test.ts`: `processLocationUpdate` calls `upsertUserLocation` after `updateUser`; `upsertUserLocation` throwing does not fail `processLocationUpdate`; existing tests still pass

## 7. Verification

- [x] 7.1 `npm test` passes with coverage > 90%; `npm run lint` clean
- [ ] 7.2 With Qdrant running, app boots, collection auto-creates, restart is a clean no-op; seeded user identity + location points visible at `localhost:6333`
- [ ] 7.3 Send `LOCATION_UPDATE` → exactly one location point per user, value reflects new coordinates (overwrite confirmed)
- [ ] 7.4 Stop Qdrant, send `LOCATION_UPDATE` → `processLocationUpdate` still succeeds, embedding failure logged, app does not crash
- [x] 7.5 `grep` confirms `agent-runner.ts` and `message.service.ts` are unchanged in this slice
