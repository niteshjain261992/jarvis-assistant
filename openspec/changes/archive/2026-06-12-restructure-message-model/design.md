# Design

## Context

`MessageModel` currently stores legacy command-flow fields (`prompt`, `ackText`, `command`, `errorCode`, `errorMessage`). `ConversationModel` exists with string UUID `_id`. The user wants a conversation-centric message schema and explicitly asked to change only the model file in this iteration, accepting temporary type/test breakage elsewhere.

## Goals / Non-Goals

**Goals:**

- Redefine `MessageDocument`, enums, and Mongoose schema in `src/models/message.model.ts`
- `conversationId` as string reference to `Conversation` model (`ref: 'Conversation'`)
- Preserve string `_id` UUID, `messages` collection name, and `MessageModel` export name

**Non-Goals:**

- Updating `message.repository.ts`, `message.service.ts`, controllers, routes, or tests
- HTTP/API behavior changes
- Data migration of existing MongoDB documents
- Fixing compile errors or failing tests (next iteration)

## Decisions

### 1. Field mapping (camelCase in TypeScript)

| User field | TypeScript property | Type |
|------------|---------------------|------|
| conversation_id | `conversationId` | `string` (ref → Conversation) |
| type | `type` | `'text' \| 'action' \| 'image'` |
| role | `role` | `'user' \| 'assistant' \| 'system'` |
| sequence_number | `sequenceNumber` | `number` |
| content | `content` | `string` (optional when action-only) |
| action_name | `actionName` | `string` (optional) |
| action_payload | `actionPayload` | `Record<string, unknown>` / `Schema.Types.Mixed` (optional) |
| action_result | `actionResult` | `Record<string, unknown>` / `Schema.Types.Mixed` (optional) |
| action_executor | `actionExecutor` | `'assistant' \| 'mobile_client' \| 'server'` (optional) |
| model | `model` | `string` (optional) |
| status | `status` | `'processing' \| 'completed' \| 'failed'` |
| error_details | `errorDetails` | `string` (optional) |
| created_at | `createdAt` | `Date` |
| updated_at | `updatedAt` | `Date` |

`_id: string` retained as required string UUID.

### 2. Removed legacy fields

`prompt`, `ackText`, `command`, `errorCode`, `errorMessage` are removed from the model. Downstream layers still reference them until the follow-up change.

### 3. Schema definition

```ts
export type MessageType = 'text' | 'action' | 'image';
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageActionExecutor = 'assistant' | 'mobile_client' | 'server';
export type MessageStatus = 'processing' | 'completed' | 'failed';

export interface MessageDocument {
  _id: string;
  conversationId: string;
  type: MessageType;
  role: MessageRole;
  sequenceNumber: number;
  content?: string;
  actionName?: string;
  actionPayload?: Record<string, unknown>;
  actionResult?: Record<string, unknown>;
  actionExecutor?: MessageActionExecutor;
  model?: string;
  status: MessageStatus;
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Mongoose schema uses `conversationId: { type: String, ref: 'Conversation', required: true }` and `Schema.Types.Mixed` for JSON fields.

### 4. Required vs optional

Required on insert: `_id`, `conversationId`, `type`, `role`, `sequenceNumber`, `status`, `createdAt`, `updatedAt`.

Optional: `content`, `actionName`, `actionPayload`, `actionResult`, `actionExecutor`, `model`, `errorDetails` — supports text messages (content) and action messages (action fields) without forcing unused fields.

### 5. Isolation constraint

Only `src/models/message.model.ts` is edited. `MessageModel` export name unchanged so import paths stay valid; `MessageDocument` shape change will cause type errors in repository/service/tests — intentional, fixed next iteration.

### 6. Spec plane (minimal)

Update `openspec/codebase/interfaces/message.md` only under a new **Model** section documenting the restructured `MessageDocument`. Repository/service sections left as-is until follow-up.

## Risks / Trade-offs

- [Compile/test breakage] → Accepted per user constraint; follow-up change updates repository + service + tests
- [No data migration] → Existing `messages` documents with old shape are incompatible; dev DB wipe or migration is a future concern
- [Ref not enforced at DB level] → Mongoose `ref` is logical only; no foreign-key constraint in MongoDB

## Migration Plan

Single-file schema swap. No production rollout steps in this change. Follow-up change will align repository `updateMessage` partial fields and service mapping.

## Open Questions

None — user provided full field list and isolation constraint.
