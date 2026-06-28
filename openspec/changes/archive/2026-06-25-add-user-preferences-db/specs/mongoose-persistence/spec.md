## ADDED Requirements

### Requirement: User profile Mongoose models

The system SHALL define Mongoose schemas and models for user profile collections, stored in the same MongoDB database as conversations and messages:

- `Users` — `_id` (Number, required), optional `name`, `dob`, `homeLocation`, `currentLat`, `currentLon`, `lastActive` (Number, Unix seconds)
- `user_preferences` — `_id` (Number, required), `userId` (Number, required), `category` (String, required), `preferenceValue` (String, required), optional `weight` (Number); compound index on `{ userId: 1, category: 1 }`
- `location_history` — `_id` (Number, required), `userId` (Number, required), `latitude` (Number, required), `longitude` (Number, required), optional `locationName` (String), `timestamp` (Number, required); compound index on `{ userId: 1, timestamp: -1 }`

Models SHALL live under `src/models/` (`user.model.ts`, `user-preference.model.ts`, `location-history.model.ts`). Collection names SHALL match the product spec exactly (`Users`, `user_preferences`, `location_history`).

#### Scenario: User model collection name

- **WHEN** a user document is persisted via `UserModel`
- **THEN** the document is stored in the `Users` collection

#### Scenario: User preference model collection name

- **WHEN** a preference document is persisted via `UserPreferenceModel`
- **THEN** the document is stored in the `user_preferences` collection

#### Scenario: Location history model collection name

- **WHEN** a location history document is persisted via `LocationHistoryModel`
- **THEN** the document is stored in the `location_history` collection

### Requirement: No new database configuration

This change SHALL NOT add new env variables, npm dependencies, or config modules for database connectivity. New models SHALL use the existing Mongoose connection established by `connectMongo`.

#### Scenario: Env unchanged

- **WHEN** `src/config/env.ts` is inspected after implementation
- **THEN** no new database-related env keys were added

#### Scenario: Package manifest unchanged

- **WHEN** `package.json` dependencies are compared before and after
- **THEN** no new database driver packages were added
