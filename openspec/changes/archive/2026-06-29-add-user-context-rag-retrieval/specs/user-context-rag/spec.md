## ADDED Requirements

### Requirement: Prompt-driven retrieval with mandatory user filter

The system SHALL provide `retrieveUserContext(prompt, userId)` that returns the most relevant user-context facts for the current user as a single string. Retrieval SHALL mirror the write path's raw-client style: embed the prompt via `embedText` and call `getQdrantClient().search(COLLECTION_NAME, { vector, limit: 3, filter, with_payload: true })`. The search filter SHALL be `{ must: [{ key: 'userId', match: { value: userId } }] }` — the `userId` payload filter is MANDATORY and the system SHALL NEVER issue a search without it. Retrieved point texts SHALL be read from `payload.text` and joined with newlines.

#### Scenario: Embed and search with a userId filter

- **WHEN** `retrieveUserContext` runs with a non-empty `userId` and prompt
- **THEN** the prompt is embedded via `embedText`
- **AND** `search` is called against `user_context` with `limit: 3`, `with_payload: true`, and a filter whose `must` clause matches `userId`

#### Scenario: Multiple matches joined by newlines

- **WHEN** the search returns more than one matching point
- **THEN** the returned string is the points' `payload.text` values joined by newlines

#### Scenario: Search excludes other users' facts

- **WHEN** the `user_context` collection holds points for several users and `retrieveUserContext` runs for one `userId`
- **THEN** the search filter restricts results to that `userId` and other users' facts are never returned

### Requirement: Retrieval guards and non-fatal semantics

`retrieveUserContext` SHALL return an empty string `''` when it cannot produce useful context, and SHALL NEVER throw. When `userId` is empty or falsy it SHALL return `''` immediately WITHOUT embedding or searching. When the search returns zero matches it SHALL return `''`. Any error from embedding or searching SHALL be caught, logged via `logger.error`, and result in `''` so the caller always receives a usable string.

#### Scenario: Empty userId skips embed and search

- **WHEN** `retrieveUserContext` is called with an empty or falsy `userId`
- **THEN** it returns `''` without calling `embedText` and without calling `search`

#### Scenario: Zero matches returns empty

- **WHEN** the search returns no matching points
- **THEN** `retrieveUserContext` returns `''`

#### Scenario: Embed or search failure returns empty

- **WHEN** `embedText` or `search` throws during `retrieveUserContext`
- **THEN** the error is logged via `logger.error` and the function returns `''` rather than throwing

### Requirement: Retrieved context injected into the system prompt

The agent system prompt builder SHALL accept retrieved user context and, when it is non-empty, inject it as a labeled section `Known information about the user:\n<context>` placed BEFORE the conversation-summary section. When the retrieved context is empty the section SHALL be omitted entirely. Persona, tool policy, and date/time sections SHALL be unchanged.

#### Scenario: Non-empty context appears in the prompt

- **WHEN** the system prompt is built with non-empty user context
- **THEN** the prompt contains a `Known information about the user:` section carrying that context, positioned before any summary section

#### Scenario: Empty context omits the section

- **WHEN** the system prompt is built with empty user context
- **THEN** no `Known information about the user:` section appears in the prompt

#### Scenario: Qdrant down still answers

- **WHEN** Qdrant is unavailable and an agent turn runs
- **THEN** retrieval returns `''`, no user-context section is injected, and the turn still produces an answer without crashing

## MODIFIED Requirements

### Requirement: Embed-on-write at stable point ids

The system SHALL embed user identity and location facts into the `user_context` collection using deterministic, stable point ids derived from the user id: identity at `${userId}:identity` and location at `${userId}:location`. Each point's content SHALL be a natural-language sentence built only from defined `UserDocument` fields and SHALL never emit the literal word "undefined". Each point's payload SHALL include `{ userId, type }` where `type` is `'identity'` or `'location'`, AND SHALL ALSO include the natural-language sentence as `text` so retrieval can return it directly without re-deriving it from the user record.

Identity content SHALL be built from `name`, `dob`, `homeLocation` (whichever are present). Location content SHALL use the human-readable `currentLocationName` when present (e.g. `"User's current location is <currentLocationName>."`); when `currentLocationName` is absent but `currentLat` and `currentLon` are present it SHALL fall back to a coordinate sentence (e.g. `"User's current location is latitude <lat>, longitude <lon>."`); when neither a name nor coordinates are present the location upsert SHALL be skipped.

#### Scenario: Identity upsert builds a sentence and stable id

- **WHEN** `upsertUserIdentity` runs for a user with a name and home location but no dob
- **THEN** a point is upserted at id `${userId}:identity` whose content includes the name and home location, omits the dob, and contains no literal "undefined", with metadata type `'identity'`

#### Scenario: Location upsert uses the readable name

- **WHEN** `upsertUserLocation` runs for a user whose `currentLocationName` is set
- **THEN** a point is upserted at id `${userId}:location` whose content contains the place name and not the raw latitude/longitude, with metadata type `'location'`

#### Scenario: Location upsert falls back to coordinates

- **WHEN** `upsertUserLocation` runs for a user with `currentLat` and `currentLon` set but no `currentLocationName`
- **THEN** a point is upserted at id `${userId}:location` whose content reflects the coordinates, with metadata type `'location'`

#### Scenario: Missing name and coordinates skip location embed

- **WHEN** `upsertUserLocation` runs for a user missing `currentLocationName`, `currentLat`, and `currentLon`
- **THEN** no embedding is computed and no upsert is performed

#### Scenario: Sentence stored on the payload for retrieval

- **WHEN** `upsertUserIdentity` or `upsertUserLocation` upserts a point
- **THEN** the point's payload includes `text` equal to the natural-language sentence that was embedded

## REMOVED Requirements

### Requirement: Retrieval deferred

**Reason**: This change implements the retrieval read path, so the deferral no longer holds. Retrieval (`retrieveUserContext`) and injection of user context into the agent system prompt are now specified by the "Prompt-driven retrieval with mandatory user filter", "Retrieval guards and non-fatal semantics", and "Retrieved context injected into the system prompt" requirements above.

**Migration**: None — retrieval is purely additive and non-fatal. `agent-runner.ts` and `message.service.ts` now participate in retrieval as specified; no existing data migration is required because the startup backfill re-embeds the seeded user with the new `payload.text` field.
