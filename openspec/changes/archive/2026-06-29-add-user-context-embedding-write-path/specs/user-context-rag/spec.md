## ADDED Requirements

### Requirement: Vector collection lifecycle

The system SHALL provide an idempotent `ensureCollection` helper that creates a `user_context` Qdrant collection if it does not already exist, configured with a vector size of `768` (sourced from a named constant matching the `nomic-embed-text` model) and cosine distance. Calling `ensureCollection` when the collection already exists SHALL be a no-op and SHALL NOT raise an error. The Qdrant client SHALL be obtained via a singleton-style accessor pointed at `env.QDRANT_URL` and reused across calls.

#### Scenario: Collection created when absent

- **WHEN** `ensureCollection` runs and the `user_context` collection does not exist
- **THEN** a collection named `user_context` is created with vector size `768` and cosine distance

#### Scenario: Idempotent when collection exists

- **WHEN** `ensureCollection` runs and the `user_context` collection already exists
- **THEN** no creation call is made and no error is raised

#### Scenario: Client is reused

- **WHEN** the Qdrant client accessor is called more than once
- **THEN** the same client instance is returned rather than a new connection each time

### Requirement: Embed-on-write at stable point ids

The system SHALL embed user identity and location facts into the `user_context` collection using deterministic, stable point ids derived from the user id: identity at `${userId}:identity` and location at `${userId}:location`. Each point's content SHALL be a natural-language sentence built only from defined `UserDocument` fields (identity from `name`, `dob`, `homeLocation` whichever are present; location from `currentLat` and `currentLon`), and SHALL never emit the literal word "undefined". Each point's metadata SHALL include `{ userId, type }` where `type` is `'identity'` or `'location'`.

#### Scenario: Identity upsert builds a sentence and stable id

- **WHEN** `upsertUserIdentity` runs for a user with a name and home location but no dob
- **THEN** a point is upserted at id `${userId}:identity` whose content includes the name and home location, omits the dob, and contains no literal "undefined", with metadata type `'identity'`

#### Scenario: Location upsert builds a sentence and stable id

- **WHEN** `upsertUserLocation` runs for a user with `currentLat` and `currentLon` set
- **THEN** a point is upserted at id `${userId}:location` whose content reflects the coordinates, with metadata type `'location'`

#### Scenario: Missing coordinates skip location embed

- **WHEN** `upsertUserLocation` runs for a user missing `currentLat` or `currentLon`
- **THEN** no embedding is computed and no upsert is performed

### Requirement: Overwrite semantics

Re-embedding the same fact type for the same user SHALL overwrite the existing point rather than accumulate duplicates, because the point id is a deterministic function of `userId` and fact type.

#### Scenario: Location change overwrites the single point

- **WHEN** `upsertUserLocation` is called twice for the same user with different coordinates
- **THEN** both calls upsert at the same id `${userId}:location`, leaving exactly one location point for that user whose value reflects the latest coordinates

### Requirement: Non-fatal write semantics

All embedding and Qdrant write operations in the user-context write path SHALL be non-fatal: any error SHALL be caught, logged via `logger.error`, and the function SHALL return normally without rethrowing. A failed embed or upsert SHALL NOT propagate to the caller or fail the originating operation, because Mongo is the source of truth and Qdrant is a rebuildable derived index.

#### Scenario: Embedding failure is swallowed

- **WHEN** the embedder or Qdrant upsert throws during `upsertUserIdentity` or `upsertUserLocation`
- **THEN** the error is logged and the function resolves normally without rethrowing

#### Scenario: Qdrant down does not fail location update

- **WHEN** Qdrant is unavailable and a location update triggers `upsertUserLocation`
- **THEN** `processLocationUpdate` still completes successfully (Mongo updated) and the embedding failure is logged

### Requirement: Startup backfill

On application startup, after the Qdrant collection is ensured, the system SHALL load the single user and embed both identity and location so an already-seeded user is present in Qdrant without waiting for a data change. Backfill and Qdrant initialization failures SHALL be non-fatal so the application still boots when Qdrant is down.

#### Scenario: Seeded user embedded on boot

- **WHEN** the application starts with Qdrant available and a seeded user present
- **THEN** identity and location points for that user exist in the `user_context` collection after startup

#### Scenario: Boot continues when Qdrant is down

- **WHEN** the application starts and Qdrant is unavailable
- **THEN** the startup logs the failure and the server still begins listening

### Requirement: Retrieval deferred

Retrieval (similarity search / `retrieveUserContext`) and any injection of user context into the agent or system prompt are intentionally out of scope for this capability's first slice and SHALL be specified in a later change. This change covers the write path only.

#### Scenario: No retrieval in this slice

- **WHEN** this change is implemented
- **THEN** no similarity-search or retrieval function is exposed, and `agent-runner.ts` and `message.service.ts` are unchanged
