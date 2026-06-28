## Why

User profile collections (`users`, `user_preferences`, `location_history`) use numeric `_id` and `userId` fields while conversation and message collections already use string UUIDs. This inconsistency forces sequential ID helpers (e.g. `getNextLocationHistoryId`), complicates cross-collection references, and diverges from the established UUID pattern used elsewhere in the codebase.

## What Changes

- **BREAKING**: Change `_id` from `number` to `string` (UUID) on `User`, `UserPreference`, and `LocationHistory` models
- **BREAKING**: Change `userId` foreign-key fields from `number` to `string` on `UserPreference` and `LocationHistory`
- Add `createdAt` and `updatedAt` (`Date`, required) to all three user-profile models, matching `Conversation` and `Message`
- Remove `getNextLocationHistoryId()` from `location-history.repository.ts`; callers generate `_id` via `randomUUID()` from `node:crypto`
- Update repository function signatures to accept `string` ids
- Update `location.service.ts` to generate history `_id` with `randomUUID()` and set timestamps on insert
- Update repository and service integration tests to use UUID strings

## Capabilities

### New Capabilities

_(none — this is a schema consistency refactor)_

### Modified Capabilities

- `mongoose-persistence`: User profile model field types (`_id`, refs) and timestamp fields
- `user-repository`: Document shape and repository API id types; timestamp fields
- `user-preference-repository`: Document shape and repository API id types; timestamp fields
- `location-history-repository`: Document shape, repository API id types, removal of `getNextLocationHistoryId`; timestamp fields
- `user-location-update`: Location history insert uses UUID `_id` instead of sequential id helper

## Impact

- **Models**: `src/models/user.model.ts`, `src/models/user-preference.model.ts`, `src/models/location-history.model.ts`
- **Repositories**: `src/repositories/user.repository.ts`, `src/repositories/user-preference.repository.ts`, `src/repositories/location-history.repository.ts`
- **Services**: `src/services/location.service.ts`
- **Tests**: `tests/repositories/user.repository.test.ts`, `tests/repositories/user-preference.repository.test.ts`, `tests/repositories/location-history.repository.test.ts`, `tests/services/location.service.test.ts`
- **Data**: Existing numeric documents in MongoDB will not match the new schema; acceptable for pre-production single-user setup (no migration script in scope)
