## Context

Jarvis persists conversations and messages in MongoDB via Mongoose (`src/models/`, `src/repositories/`, `src/config/mongodb.ts`). User profile data — name, DOB, home location, current coordinates, learned preferences, and location history — belongs in the same MongoDB database using three collections named `Users`, `user_preferences`, and `location_history`.

This change adds Mongoose models and repository wrappers only. No service, controller, route, agent, or server bootstrap code imports the new modules. No new env vars, packages, or config modules are introduced.

Existing patterns to follow:

- Mongoose schemas in `src/models/*.model.ts` with explicit `collection` names and exported `*Model`.
- Repository modules export async functions and re-export document types from models.
- Integration tests under `tests/` use `mongodb-memory-server` + `connectMongo` / `disconnectMongo`.
- `@/` import alias with `.js` extensions; ESM only.
- TypeScript field names use camelCase; MongoDB collection names match the product spec.

## Goals / Non-Goals

**Goals:**

- Three Mongoose model modules with schemas matching the product field definitions.
- Three repository modules with focused CRUD aligned to future personalization use cases.
- Numeric integer `_id` on `Users`; child documents reference `userId` (maps to product `user_id`).
- Compound indexes on `user_preferences` (`userId` + `category`) and `location_history` (`userId` + `timestamp`).
- Repository isolation: no imports from `server.ts`, `app.ts`, services, controllers, agent, or WebSocket code.
- Jest integration tests with `mongodb-memory-server` covering happy paths and null lookups.

**Non-Goals:**

- HTTP/WebSocket APIs, agent system-prompt injection, or service-layer orchestration.
- New database drivers, env vars, or `package.json` changes.
- MongoDB-level foreign-key enforcement (not supported); optional repository-level user-existence checks are acceptable but not required in v1.
- Reverse geocoding, preference inference, or background jobs.
- Changes to `src/server.ts` or existing MongoDB connection lifecycle.

## Decisions

### 1. MongoDB via existing Mongoose stack (not SQLite)

All three collections live in the same MongoDB database as conversations and messages, using the existing `connectMongo` connection. No second datastore.

**Alternative:** SQLite for relational FK semantics. Rejected per product direction — single MongoDB database for everything.

### 2. Collection schemas

**`Users`** (collection name `Users`):

| Field (TS) | MongoDB type | Notes |
|------------|--------------|-------|
| `_id` | Number | Integer user id (caller-supplied on insert, same pattern as string UUID `_id` on conversations) |
| `name` | String | Preferred name/nickname |
| `dob` | String | ISO 8601 date `YYYY-MM-DD` |
| `homeLocation` | String | Primary residence/city |
| `currentLat` | Number | Optional last known latitude |
| `currentLon` | Number | Optional last known longitude |
| `lastActive` | Number | Unix timestamp (seconds) |

**`user_preferences`** (collection name `user_preferences`):

| Field (TS) | MongoDB type | Notes |
|------------|--------------|-------|
| `_id` | Number | Integer row id (caller-supplied on insert) |
| `userId` | Number | References `Users._id` |
| `category` | String | e.g. `music`, `movie`, `food`, `sports`, `general` |
| `preferenceValue` | String | e.g. `Classic Rock` |
| `weight` | Number | Optional 1–5 |

Index: `{ userId: 1, category: 1 }`.

**`location_history`** (collection name `location_history`):

| Field (TS) | MongoDB type | Notes |
|------------|--------------|-------|
| `_id` | Number | Integer row id (caller-supplied on insert) |
| `userId` | Number | References `Users._id` |
| `latitude` | Number | Required |
| `longitude` | Number | Required |
| `locationName` | String | Optional reverse-geocoded label |
| `timestamp` | Number | Unix timestamp (seconds) |

Index: `{ userId: 1, timestamp: -1 }`.

### 3. Model module shape

Each `src/models/*.model.ts` exports:

- `*Document` interface (includes `_id: number`)
- `*Insert` type omitting `_id` (caller/repository assigns id on insert)
- Mongoose `Schema` + exported `*Model`
- Optional union type for preference categories (documented, schema uses String)

Follow `conversation.model.ts` / `message.model.ts` structure: `{ collection: '<name>', versionKey: false }`.

### 4. Repository APIs

**`user.repository.ts`:**

- `insertUser(doc: UserDocument): Promise<UserDocument>` — full document including `_id`
- `findUserById(id: number): Promise<UserDocument | null>`
- `updateUser(id: number, update: Partial<Pick<UserDocument, 'name' | 'dob' | 'homeLocation' | 'currentLat' | 'currentLon' | 'lastActive'>>): Promise<void>`
- `touchLastActive(id: number, timestamp: number): Promise<void>`

**`user-preference.repository.ts`:**

- `insertUserPreference(doc: UserPreferenceDocument): Promise<UserPreferenceDocument>`
- `findUserPreferenceById(id: number): Promise<UserPreferenceDocument | null>`
- `findPreferencesByUserId(userId: number): Promise<UserPreferenceDocument[]>`
- `findPreferencesByUserIdAndCategory(userId: number, category: string): Promise<UserPreferenceDocument[]>`
- `updateUserPreference(id: number, update: Partial<Pick<UserPreferenceDocument, 'category' | 'preferenceValue' | 'weight'>>): Promise<void>`
- `deleteUserPreference(id: number): Promise<void>`

**`location-history.repository.ts`:**

- `insertLocationHistory(doc: LocationHistoryDocument): Promise<LocationHistoryDocument>`
- `findLocationHistoryById(id: number): Promise<LocationHistoryDocument | null>`
- `findLocationHistoryByUserId(userId: number, limit?: number): Promise<LocationHistoryDocument[]>` — default limit 50, `timestamp` descending
- `deleteLocationHistory(id: number): Promise<void>`

Insert functions mirror `insertConversation`: caller provides `_id` (and `userId` on child docs). Future integration can centralize id generation.

### 5. No config or env changes

Repositories use Mongoose models directly; tests call `connectMongo(mongod.getUri(), 'test')` like `conversation.repository.test.ts`. No changes to `env.ts`, `.env.example`, or `package.json`.

### 6. Repository isolation

Same rule as `conversation-repository` spec: new repository modules MUST NOT be imported by application bootstrap or business services.

### 7. Test strategy

Each repository test file:

- `beforeAll`: `MongoMemoryServer.create()` + `connectMongo`
- `afterAll`: `disconnectMongo` + `mongod.stop()`
- `beforeEach`: `Model.deleteMany({})` on relevant collections
- Cover insert/find, null lookup, partial update, ordering/limit, delete

No FK constraint tests at DB level; MongoDB does not enforce referential integrity.

## Risks / Trade-offs

- **[Risk] No DB-enforced foreign keys** → **Mitigation:** Accept for v1; future service layer can validate `userId` before child inserts.
- **[Risk] Numeric `_id` differs from ObjectId default** → **Mitigation:** Explicit Number `_id` in schema; consistent with product integer id spec; caller assigns ids like conversation UUID pattern.
- **[Risk] Collection name `Users` (capital U) is atypical in MongoDB** → **Mitigation:** Explicit `collection: 'Users'` in schema; matches product table name.

## Migration Plan

1. Implement models, repositories, and tests
2. No server or env changes — collections appear on first insert during future integration
3. Rollback: remove new files only

## Open Questions

- None for v1 — single implicit user (`_id: 1`) can be assumed by future integration without schema changes.
