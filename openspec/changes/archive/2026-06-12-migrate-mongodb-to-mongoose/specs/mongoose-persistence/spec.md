# mongoose-persistence Specification

## Purpose

Define Mongoose as the MongoDB ODM for Jarvis: connection lifecycle, schema/model definitions, and model-backed repository operations replacing the native driver.

## ADDED Requirements

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

- `messages` — fields matching current `MessageDocument` (`_id` string, `prompt`, `ackText`, optional `command`/`model`/`errorCode`/`errorMessage`, `status` enum, `createdAt`, `updatedAt`)
- `conversations` — fields matching current `ConversationDocument` (`_id` string, optional `title`/`summary`, `source` enum, `status` enum, `lastSequenceNumber`, `createdAt`, `updatedAt`)

Models SHALL live under `src/models/` (e.g., `message.model.ts`, `conversation.model.ts`). String `_id` SHALL be used (not ObjectId auto-generation) to preserve existing UUID poll paths.

#### Scenario: Message model collection name

- **WHEN** a message is persisted via the Mongoose model
- **THEN** the document is stored in the `messages` collection

#### Scenario: Conversation model collection name

- **WHEN** a conversation is persisted via the Mongoose model
- **THEN** the document is stored in the `conversations` collection

### Requirement: Repository layer uses models

`message.repository.ts` and `conversation.repository.ts` SHALL use Mongoose model APIs instead of native `Collection`/`getDb()`. Public repository function signatures and return types (`MessageDocument`, `ConversationDocument`, etc.) SHALL remain unchanged.

#### Scenario: Message repository API preserved

- **WHEN** callers invoke `insertMessage`, `findMessageById`, or `updateMessage`
- **THEN** behavior and types match the pre-migration repository contract

#### Scenario: Conversation repository API preserved

- **WHEN** callers invoke `insertConversation`, `findConversationById`, or `updateConversation`
- **THEN** behavior and types match the pre-migration repository contract

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
