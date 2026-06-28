## Context

User profile models (`User`, `UserPreference`, `LocationHistory`) currently use numeric `_id` and `userId` fields with caller-supplied sequential integers. Conversation and message models already use string UUID `_id` values generated via `randomUUID()` from `node:crypto`. The location update flow depends on `getNextLocationHistoryId()` to allocate history row ids — an unnecessary sequential counter pattern that does not scale and is inconsistent with the rest of the persistence layer.

None of the user-profile models include `createdAt` / `updatedAt`, while `Conversation` and `Message` do.

## Goals / Non-Goals

**Goals:**

- Align `_id` and foreign-key types across all Mongoose models (string UUID)
- Add `createdAt` and `updatedAt` to user-profile models
- Remove `getNextLocationHistoryId()` and generate history `_id` at the call site
- Update repositories, location service, and tests to use string ids and timestamps
- Keep repository isolation rules unchanged

**Non-Goals:**

- Data migration script for existing numeric documents in MongoDB
- Changing `lastActive` or `timestamp` field semantics (remain Unix seconds)
- Adding Mongoose schema middleware / auto-timestamps (match explicit Date pattern used by conversation repository)
- Integrating user preferences into services or HTTP routes

## Decisions

### 1. UUID generation: `randomUUID()` at call site

Use `import { randomUUID } from 'node:crypto'` — same pattern as `message.service.ts` and `tool-persistence.ts`.

**Alternative considered:** Mongoose default ObjectId — rejected because messages/conversations use explicit string UUIDs and the codebase convention is caller-supplied string `_id`.

### 2. Timestamp management: explicit `Date` fields, set by repository on update

- **Insert**: caller supplies `createdAt` and `updatedAt` (tests and services set both to `new Date()` at insert time)
- **Update**: repository methods (`updateUser`, `updateUserPreference`) append `updatedAt: new Date()` to the `$set` payload, matching `conversation.repository.ts`

**Alternative considered:** Mongoose `{ timestamps: true }` — rejected to stay consistent with existing models that declare explicit Date schema fields and manual `updatedAt` on update.

### 3. Remove `getNextLocationHistoryId` entirely

`location.service.ts` generates `_id` with `randomUUID()` when inserting history. The repository no longer exposes any id-allocation helper.

### 4. Type changes propagate through repository signatures only

All `id: number` and `userId: number` parameters become `string`. No HTTP or WebSocket API surface changes — location update envelope payload is unchanged (lat/lon only).

### 5. No database migration

Pre-production single-user setup; existing numeric documents can be dropped manually. Tests use fresh `mongodb-memory-server` instances.

## Risks / Trade-offs

- **[Breaking schema change]** → Existing MongoDB documents with numeric `_id` will not match new types. Mitigation: drop and re-seed collections in dev; document in change notes.
- **[Test fixture churn]** → All hardcoded `_id: 1` values become UUID strings. Mitigation: use `randomUUID()` or fixed UUID constants in tests.
- **[Partial update without updatedAt]** → Callers that bypass repository update helpers won't refresh `updatedAt`. Mitigation: all updates go through repository functions per spec.

## Migration Plan

1. Update model schemas and TypeScript interfaces
2. Update repository signatures and update helpers
3. Update `location.service.ts` to use `randomUUID()` and set timestamps
4. Update all affected tests
5. Run `npm test` — no deployment steps; drop stale collections if needed locally

**Rollback:** Revert code changes; no schema version field exists.

## Open Questions

_(none — scope is fully defined)_
