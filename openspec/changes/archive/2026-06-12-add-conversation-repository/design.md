# Design

## Context

Jarvis already persists async command messages via `src/repositories/message.repository.ts` on the `messages` collection. Conversations will eventually group messages into sessions, but wiring services and HTTP endpoints is out of scope for this change. The user requires a standalone repository layer with a defined document schema and no references from the rest of the application.

Engineering constraints: layered architecture, native MongoDB driver (no Mongoose), camelCase field names in TypeScript (matching `message.repository`), 90% Jest coverage.

## Goals / Non-Goals

**Goals:**

- Define `ConversationDocument` with typed `source` and `status` enums
- Implement `insertConversation`, `findConversationById`, `updateConversation` on collection `conversations`
- Ship repository integration tests mirroring `message.repository.test.ts`
- Document the interface in `openspec/codebase/interfaces/conversation.md`

**Non-Goals:**

- Conversation service, controller, or HTTP routes
- Linking messages to conversations (foreign keys, indexes)
- Schema validation at the database level (MongoDB JSON Schema) — enforced via TypeScript types and test fixtures
- Importing `conversation.repository` from any existing application module

## Decisions

### 1. Document schema (camelCase in code)

User-specified fields map to TypeScript properties following existing repo convention:

| User field | TypeScript property | Notes |
|------------|---------------------|-------|
| title | `title?` | optional string |
| source | `source` | required: `'mobile' \| 'cli' \| 'api'` |
| status | `status` | required, default `'active'` at insert time |
| summary | `summary?` | optional string |
| last_sequence_number | `lastSequenceNumber` | required number, default `0` |
| created_at | `createdAt` | required `Date` |
| updated_at | `updatedAt` | required `Date`, refreshed on update |

`_id` remains a string UUID, consistent with `messages`.

### 2. Repository API (mirror message.repository)

```ts
export type ConversationSource = 'mobile' | 'cli' | 'api';
export type ConversationStatus = 'active' | 'idle' | 'archived' | 'error';

export interface ConversationDocument {
  _id: string;
  title?: string;
  source: ConversationSource;
  status: ConversationStatus;
  summary?: string;
  lastSequenceNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export function insertConversation(doc: ConversationDocument): Promise<ConversationDocument>;
export function findConversationById(id: string): Promise<ConversationDocument | null>;
export function updateConversation(
  id: string,
  update: Partial<Pick<ConversationDocument, 'title' | 'summary' | 'status' | 'lastSequenceNumber'>>,
): Promise<void>;
```

- Collection name: `conversations`
- `updateConversation` uses `$set` with spread update + `updatedAt: new Date()`, same pattern as `updateMessage`
- Defaults (`status: 'active'`, `lastSequenceNumber: 0`) are caller responsibility on insert; tests assert explicit values

### 3. No application wiring

Per user constraint, the only new runtime code is `src/repositories/conversation.repository.ts`. No changes to `app.ts`, `server.ts`, services, or controllers. Grep verification in tasks ensures zero imports outside the repository and its tests.

### 4. Testing

- File: `tests/repositories/conversation.repository.test.ts`
- Setup: reuse `mongodb-memory-server` + `connectMongo`/`disconnectMongo` pattern from `message.repository.test.ts`
- Cases: insert + find, null lookup, partial update (`status`, `lastSequenceNumber`, `summary`) with `updatedAt` advancement
- `beforeEach`: `deleteMany` on `conversations` collection

### 5. Spec plane

- Delta spec: `openspec/changes/add-conversation-repository/specs/conversation-repository/spec.md`
- New interface doc: `openspec/codebase/interfaces/conversation.md`
- Update `openspec/codebase/map.md` to list the new repository module

## Risks / Trade-offs

- [No DB-level enum enforcement] → TypeScript types + tests suffice for v1; MongoDB JSON Schema can be added when services consume this layer
- [Defaults not enforced in repository] → Callers must pass `status` and `lastSequenceNumber`; a future service layer can apply defaults before insert
- [Unused code until next change] → Intentional per constraint; keeps this PR small and reviewable

## Migration Plan

No migration — new collection with no existing data. Deploy is additive: ship repository + tests only.

## Open Questions

None — schema and isolation constraint are fully specified by the user.
