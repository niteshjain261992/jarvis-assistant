# conversation-repository Specification

## Purpose

Define MongoDB persistence for conversation documents: typed enums, required fields with defaults, and repository CRUD operations. This capability is repository-only — no HTTP or service integration.

## Requirements

### Requirement: Conversation document shape

The system SHALL persist conversation documents in MongoDB collection `conversations` with the following fields:

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `_id` | string (UUID) | yes | — |
| `title` | string | no | — |
| `source` | `'mobile' \| 'cli' \| 'api'` | yes | — |
| `status` | `'active' \| 'idle' \| 'archived' \| 'error'` | yes | `'active'` |
| `summary` | string | no | — |
| `lastSequenceNumber` | number | yes | `0` |
| `createdAt` | Date | yes | set on insert |
| `updatedAt` | Date | yes | set on insert and update |

#### Scenario: Insert with required fields only

- **WHEN** a conversation document is inserted with `_id`, `source`, `status: 'active'`, `lastSequenceNumber: 0`, and timestamps
- **THEN** the document is retrievable by `_id` with those field values

#### Scenario: Optional title and summary

- **WHEN** a conversation document is inserted without `title` or `summary`
- **THEN** the stored document omits or leaves those fields undefined without failing insert

### Requirement: Conversation source enum

The `source` field SHALL be one of `'mobile'`, `'cli'`, or `'api'`. The repository type definitions SHALL encode this union; callers are responsible for supplying a valid value at insert time.

#### Scenario: Valid source values

- **WHEN** a conversation is inserted with `source: 'mobile'`, `'cli'`, or `'api'`
- **THEN** `findConversationById` returns the document with the matching `source`

### Requirement: Conversation status enum

The `status` field SHALL be one of `'active'`, `'idle'`, `'archived'`, or `'error'`. New conversations SHALL default to `'active'` when callers omit an explicit status on insert.

#### Scenario: Default active status

- **WHEN** a conversation is inserted with `status: 'active'`
- **THEN** the persisted document has `status: 'active'`

#### Scenario: Status update

- **WHEN** `updateConversation` sets `status` to `'archived'`
- **THEN** the stored document reflects `status: 'archived'` and a refreshed `updatedAt`

### Requirement: Repository operations

The conversation repository SHALL export:

- `insertConversation(doc: ConversationDocument): Promise<ConversationDocument>`
- `findConversationById(id: string): Promise<ConversationDocument | null>`
- `updateConversation(id: string, update: Partial<Pick<ConversationDocument, 'title' | 'summary' | 'status' | 'lastSequenceNumber'>>): Promise<void>`

Updates SHALL merge the partial fields via `$set` and SHALL always refresh `updatedAt`.

#### Scenario: Insert and find by id

- **WHEN** `insertConversation` is called with a valid document
- **THEN** `findConversationById` returns the same document

#### Scenario: Find missing conversation

- **WHEN** `findConversationById` is called with an unknown id
- **THEN** the result is `null`

#### Scenario: Partial update

- **WHEN** `updateConversation` updates `lastSequenceNumber` and `summary`
- **THEN** only those fields change and `updatedAt` is newer than the previous value

### Requirement: Summary field maintained by background worker

The `summary` field on conversation documents SHALL be updated asynchronously by the conversation-summary Agenda worker. The repository `updateConversation` partial update for `summary` SHALL be used by the worker to persist rolling summaries.

#### Scenario: Summary persisted via repository

- **WHEN** the summary worker completes summarization for a conversation
- **THEN** `updateConversation` is called with `{ summary }` and `updatedAt` is refreshed

### Requirement: Repository isolation

The conversation repository module SHALL NOT be imported by any service, controller, route, or application bootstrap file. Only the repository module itself and its dedicated tests MAY reference it.

#### Scenario: No application wiring

- **WHEN** the change is applied
- **THEN** `src/app.ts`, `src/server.ts`, and all files under `src/services/` and `src/controllers/` contain no imports from `conversation.repository`

### Requirement: Repository tests

The change SHALL include Jest integration tests for the conversation repository using `mongodb-memory-server`, covering insert/find, null lookup, and partial update with `updatedAt` refresh. `npm test` MUST pass with global coverage ≥ 90%.

#### Scenario: Test suite passes

- **WHEN** `npm test` runs after implementation
- **THEN** conversation repository tests pass and coverage thresholds are met
