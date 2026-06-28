# mongoose-persistence Specification

## Purpose

Define Mongoose as the MongoDB ODM for Jarvis: connection lifecycle, schema/model definitions, and model-backed repository operations.

## MODIFIED Requirements

### Requirement: Mongoose schemas and models

The system SHALL define Mongoose schemas and models for existing collections:

- `messages` — conversation-linked message documents with string `_id` (UUID), `conversationId` (string ref to `Conversation`), `type` (`'text' | 'action' | 'image'`), `role` (`'user' | 'assistant' | 'system'`), `sequenceNumber`, optional `content`, optional action fields (`actionName`, `actionPayload`, `actionResult`, `actionExecutor`), optional `model`, `status` (`'processing' | 'completed' | 'failed'`), optional `errorDetails`, `createdAt`, `updatedAt`
- `conversations` — fields matching current `ConversationDocument` (`_id` string, optional `title`/`summary`, `source` enum, `status` enum, `lastSequenceNumber`, `createdAt`, `updatedAt`)

Models SHALL live under `src/models/` (e.g., `message.model.ts`, `conversation.model.ts`). String `_id` SHALL be used (not ObjectId auto-generation) to preserve existing UUID poll paths.

#### Scenario: Message model collection name

- **WHEN** a message is persisted via the Mongoose model
- **THEN** the document is stored in the `messages` collection

#### Scenario: Message references conversation

- **WHEN** a message document includes `conversationId`
- **THEN** the value is a string matching a conversation `_id` in the `conversations` collection

#### Scenario: Conversation model collection name

- **WHEN** a conversation is persisted via the Mongoose model
- **THEN** the document is stored in the `conversations` collection

### Requirement: Repository layer uses models

`message.repository.ts` and `conversation.repository.ts` SHALL use Mongoose model APIs instead of native `Collection`/`getDb()`. Public repository function signatures (`insertMessage`, `findMessageById`, `updateMessage`, etc.) SHALL remain exported; alignment of `MessageDocument` types and update partials with the new schema is deferred to a follow-up change.

#### Scenario: Message repository API preserved

- **WHEN** callers invoke `insertMessage`, `findMessageById`, or `updateMessage`
- **THEN** the functions remain exported from `message.repository.ts` (type/shape alignment deferred)

#### Scenario: Conversation repository API preserved

- **WHEN** callers invoke `insertConversation`, `findConversationById`, or `updateConversation`
- **THEN** behavior and types match the pre-migration repository contract
