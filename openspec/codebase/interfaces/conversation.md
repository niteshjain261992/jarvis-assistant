# Interface: conversation (`src/repositories/conversation.repository.ts`, `src/services/conversation-summary.service.ts`)

Repository layer for conversation documents; `summary` is maintained asynchronously by the conversation-summary Agenda worker.

## Exports

```ts
export type ConversationSource = 'mobile' | 'cli' | 'api';
export type ConversationStatus = 'active' | 'idle' | 'archived' | 'error';

export interface ConversationDocument {
  _id: string; // UUID
  title?: string;
  source: ConversationSource;
  status: ConversationStatus; // default 'active' at insert time (caller responsibility)
  summary?: string; // rolling summary updated by Agenda worker
  lastSequenceNumber: number; // default 0 at insert time (caller responsibility)
  createdAt: Date;
  updatedAt: Date;
}

export function insertConversation(doc: ConversationDocument): Promise<ConversationDocument>;
export function findConversationById(id: string): Promise<ConversationDocument | null>;
export function findActiveConversation(source?: ConversationSource): Promise<ConversationDocument | null>;
export function updateConversation(
  id: string,
  update: Partial<Pick<ConversationDocument, 'title' | 'summary' | 'status' | 'lastSequenceNumber'>>,
): Promise<void>;
```

- Collection: `conversations` via `ConversationModel` (`src/models/conversation.model.ts`); connection via `connectMongo` from `interfaces/mongodb.md`.
- `updateConversation` always refreshes `updatedAt`.
- `summary` is written by `processSummaryJob` after each completed message exchange (see `interfaces/message.md`). Summary enqueue/persist events log at `debug` with `summaryJob` and `rolling` fields.
