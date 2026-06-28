## MODIFIED Requirements

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
