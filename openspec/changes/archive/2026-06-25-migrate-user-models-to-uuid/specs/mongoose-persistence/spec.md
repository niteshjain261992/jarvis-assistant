## MODIFIED Requirements

### Requirement: User profile Mongoose models

The system SHALL define Mongoose schemas and models for user profile collections, stored in the same MongoDB database as conversations and messages:

- `users` — `_id` (String, required, UUID), optional `name`, `dob`, `homeLocation`, `currentLat`, `currentLon`, `lastActive` (Number, Unix seconds), `createdAt` (Date, required), `updatedAt` (Date, required)
- `user_preferences` — `_id` (String, required, UUID), `userId` (String, required, ref `User`), `category` (String, required), `preferenceValue` (String, required), optional `weight` (Number), `createdAt` (Date, required), `updatedAt` (Date, required); compound index on `{ userId: 1, category: 1 }`
- `location_history` — `_id` (String, required, UUID), `userId` (String, required, ref `User`), `latitude` (Number, required), `longitude` (Number, required), optional `locationName` (String), `timestamp` (Number, required), `createdAt` (Date, required), `updatedAt` (Date, required); compound index on `{ userId: 1, timestamp: -1 }`

Models SHALL live under `src/models/` (`user.model.ts`, `user-preference.model.ts`, `location-history.model.ts`). String `_id` SHALL be used (not ObjectId auto-generation), consistent with `messages` and `conversations`. Collection names SHALL be `users`, `user_preferences`, and `location_history`.

#### Scenario: User model collection name

- **WHEN** a user document is persisted via `UserModel`
- **THEN** the document is stored in the `users` collection

#### Scenario: User preference model collection name

- **WHEN** a preference document is persisted via `UserPreferenceModel`
- **THEN** the document is stored in the `user_preferences` collection

#### Scenario: Location history model collection name

- **WHEN** a location history document is persisted via `LocationHistoryModel`
- **THEN** the document is stored in the `location_history` collection

#### Scenario: User profile ids are UUID strings

- **WHEN** a user profile document is inserted with a UUID string `_id`
- **THEN** `findById` returns the document with that string `_id`

#### Scenario: User profile documents include timestamps

- **WHEN** a user profile document is inserted with `createdAt` and `updatedAt`
- **THEN** both timestamp fields are persisted and returned on read
