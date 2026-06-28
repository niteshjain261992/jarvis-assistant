# mongoose-persistence Specification

## Purpose

Define Mongoose as the MongoDB ODM for Jarvis: connection lifecycle, schema/model definitions, and model-backed repository operations replacing the native driver.

## Requirements

### Requirement: Mongoose dependency

The project SHALL use `mongoose` as the runtime MongoDB ODM. The direct `mongodb` package SHALL be removed from `package.json` dependencies (it may remain as a transitive dependency of mongoose and mongodb-memory-server).

#### Scenario: Package manifest

- **WHEN** `package.json` is inspected after migration
- **THEN** `mongoose` is listed in `dependencies` and `mongodb` is not listed in `dependencies`

### Requirement: Mongoose connection lifecycle

`src/config/mongodb.ts` SHALL export `connectMongo(uri?, databaseName?)` and `disconnectMongo()` using `mongoose.connect` and `mongoose.disconnect`. Connection SHALL be singleton: repeated `connectMongo` is a no-op when already connected. Defaults SHALL remain `env.MONGODB_URI` and `env.MONGODB_DATABASE`.

#### Scenario: Connect before use

- **WHEN** `connectMongo` is called with a valid URI and database name
- **THEN** `mongoose.connection.readyState` is connected (1)

#### Scenario: Disconnect clears state

- **WHEN** `disconnectMongo` is called after a successful connect
- **THEN** `mongoose.connection.readyState` is disconnected (0)

#### Scenario: Idempotent connect

- **WHEN** `connectMongo` is called twice with different database names while already connected
- **THEN** the first connection is retained (no reconnect)

#### Scenario: Server lifecycle unchanged

- **WHEN** the server starts and shuts down gracefully
- **THEN** `src/server.ts` still calls `connectMongo()` before listen and `disconnectMongo()` after `server.close()`

### Requirement: Mongoose schemas and models

The system SHALL define Mongoose schemas and models for existing collections:

- `messages` — conversation-linked message documents with string `_id` (UUID), `conversationId` (string ref to `Conversation`), optional `parentId` (string ref to parent message), `type` (`'text' | 'action' | 'image'`), `role` (`'user' | 'assistant' | 'system'`), `sequenceNumber`, optional `content`, optional action fields (`actionName`, `actionPayload`, `actionResult`, `actionExecutor` where `actionExecutor` is `'assistant' | 'client' | 'server'`), optional `model`, `status` (`'pending' | 'processing' | 'completed' | 'failed'`), optional `errorDetails`, `createdAt`, `updatedAt`
- `conversations` — fields matching current `ConversationDocument` (`_id` string, optional `title`/`summary`, `source` enum, `status` enum, `lastSequenceNumber`, `createdAt`, `updatedAt`)

Models SHALL live under `src/models/` (e.g., `message.model.ts`, `conversation.model.ts`). String `_id` SHALL be used (not ObjectId auto-generation) to preserve existing UUID poll paths.

#### Scenario: Message model collection name

- **WHEN** a message is persisted via the Mongoose model
- **THEN** the document is stored in the `messages` collection

#### Scenario: Message references conversation

- **WHEN** a message document includes `conversationId`
- **THEN** the value is a string matching a conversation `_id` in the `conversations` collection

#### Scenario: Assistant links to user message

- **WHEN** an assistant placeholder is created
- **THEN** `parentId` references the user message `_id` and `status` is `'processing'`

#### Scenario: Conversation model collection name

- **WHEN** a conversation is persisted via the Mongoose model
- **THEN** the document is stored in the `conversations` collection

### Requirement: Repository layer uses models

`message.repository.ts` and `conversation.repository.ts` SHALL use Mongoose model APIs. Public repository exports SHALL align with the restructured `MessageDocument` and support the message pipeline (`findActiveConversation`, dual insert, partial updates on new fields).

#### Scenario: Message repository API aligned

- **WHEN** the message pipeline calls `insertMessage` and `updateMessage`
- **THEN** operations use the new `MessageDocument` field set without legacy `prompt`/`ackText`/`command` fields

#### Scenario: Conversation repository API preserved

- **WHEN** callers invoke `insertConversation`, `findConversationById`, `updateConversation`, or `findActiveConversation`
- **THEN** operations use Mongoose models on the `conversations` collection

### Requirement: No getDb export

`getDb()` SHALL be removed from `src/config/mongodb.ts`. All database access SHALL go through Mongoose models in repositories; tests SHALL use model `deleteMany` for collection cleanup instead of `getDb().collection(...)`.

#### Scenario: Config module exports

- **WHEN** `src/config/mongodb.ts` is inspected
- **THEN** it exports only `connectMongo` and `disconnectMongo`

### Requirement: Tests updated for Mongoose

Existing MongoDB integration tests SHALL be updated to work with Mongoose while retaining `mongodb-memory-server`. `tests/config/mongodb.test.ts` and both repository test files SHALL pass. `npm test` MUST meet the 90% global coverage threshold.

#### Scenario: Full test suite passes

- **WHEN** `npm test` runs after migration
- **THEN** all tests pass and coverage thresholds are met

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

### Requirement: No new database configuration for user profile

User profile models SHALL use the existing Mongoose connection established by `connectMongo`. This capability SHALL NOT require new env variables, npm dependencies, or config modules for database connectivity.

#### Scenario: Env unchanged

- **WHEN** `src/config/env.ts` is inspected after user profile models are added
- **THEN** no new database-related env keys were added

#### Scenario: Package manifest unchanged

- **WHEN** `package.json` dependencies are compared before and after user profile models
- **THEN** no new database driver packages were added
