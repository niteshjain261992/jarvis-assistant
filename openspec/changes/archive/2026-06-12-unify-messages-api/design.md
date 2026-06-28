# Design

## Context

`MessageModel` uses conversation-linked fields but repository/service/controller still reference legacy `prompt`/`ackText`/`command`. `POST /messages` returns an ack and starts background processing; clients poll `GET /messages/:messageId`. The user wants a single synchronous endpoint matching the pseudo-code pipeline.

## Goals / Non-Goals

**Goals:**

- One `POST /messages` — input prompt, output final assistant message
- Persist user message + assistant placeholder + updates in MongoDB
- Silent intent call → conversation (text reply) or action (command + executor)
- Wire conversation repository for active-session lookup/creation

**Non-Goals:**

- `GET /messages/:messageId` (removed)
- Push/SSE to iOS for client actions (response body carries `actionExecutor: 'client'` payload; client executes locally)
- Image intent full implementation (classify may return `image`; respond with `failed` or placeholder until a later change)
- Real server action runners beyond a stub that records `actionResult`

## Decisions

### 1. HTTP contract

**Request:** `POST /messages` `{ "prompt": string }` — same validation (trimmed, 1–500 chars). Optional future: `source` for conversation creation; v1 defaults `source: 'mobile'`.

**Response (success):** HTTP 200 `MESSAGE_COMPLETED`:

```ts
{
  conversationId: string;
  type: 'text' | 'action';
  status: 'completed' | 'failed';
  content?: string;           // when type=text
  actionName?: string;        // when type=action
  actionExecutor?: 'assistant' | 'client' | 'server';
  actionPayload?: object;
  actionResult?: object;      // when server executed
  model?: string;
  errorDetails?: string;      // when status=failed
}
```

Message IDs are persisted internally but not exposed in the HTTP response.

**Response (failure):** HTTP 200 `MESSAGE_FAILED` with `errorDetails` or HTTP 502 `LLM_*` when intent/main model fails before persist completes.

Remove routes/handlers: `getMessageById`, `MESSAGE_ACCEPTED`, `MESSAGE_PROCESSING`.

### 2. Pipeline (message.service)

```
createMessage(prompt):
  1. conversation = getOrCreateActiveConversation('mobile')
  2. seq = conversation.lastSequenceNumber + 1
  3. userMsg = insert { role:user, type:text, content:prompt, status:completed, sequenceNumber:seq }
  4. assistantMsg = insert { role:assistant, type:text, status:processing, parentId:userMsg._id, sequenceNumber:seq+1 }
  5. intent = classifyIntent(prompt)  // { intent: 'conversation' | 'action' | 'image' }
  6. if intent === 'conversation':
       response = generateConversationResponse(conversation context, prompt)
       update assistant → type:text, content:response, status:completed, model
     else if intent === 'action':
       command = interpretCommand(prompt)
       parse actionName, actionExecutor, actionPayload from command catalog metadata
       update assistant → type:action, actionName, actionExecutor, actionPayload, status:completed
       if actionExecutor === 'server': runServerAction stub → update actionResult
     else: // image
       update assistant → status:failed, errorDetails: 'Image intent not supported'
  7. increment conversation.lastSequenceNumber by 2
  8. return assistant fields for HTTP response (no message IDs)
```

### 3. Model extensions (`message.model.ts`)

- Add `parentId?: string` (string ref to parent message `_id`)
- `MessageActionExecutor`: `'assistant' | 'client' | 'server'` (renamed from `mobile_client`)
- `MessageStatus` includes `'pending' | 'processing' | 'completed' | 'failed'`; assistant rows are inserted as `processing`
- Fix schema `type` enum to `['text', 'action', 'image']` (align with TypeScript; currently mismatched with `conversation`)

### 4. Conversation repository additions

```ts
findActiveConversation(source?: ConversationSource): Promise<ConversationDocument | null>;
// query: { source, status: 'active' }, sort by updatedAt desc, limit 1

createConversation(doc): ... // existing insertConversation
updateConversation(...): ... // existing, bump lastSequenceNumber
```

`getOrCreateActiveConversation`: find active → if none, create with `_id` UUID, `status: 'active'`, `lastSequenceNumber: 0`, `source: 'mobile'`.

### 5. Message repository updates

Replace legacy `updateMessage` partial fields with new shape:

```ts
updateMessage(id, update: Partial<Pick<MessageDocument,
  'type' | 'content' | 'status' | 'actionName' | 'actionPayload' | 'actionResult' |
  'actionExecutor' | 'model' | 'errorDetails'>>): Promise<void>
```

Add `findMessagesByConversationId(conversationId, limit?)` for context building (optional v1: last N messages for conversation LLM call).

### 6. Ollama service additions

- `classifyIntent(prompt): Promise<'conversation' | 'action' | 'image'>` — short system prompt, low temperature, JSON or keyword parse
- `generateConversationResponse(messages: MessageDocument[], prompt): Promise<string>` — main model with Jarvis persona + recent context
- Keep `interpretCommand` for action branch
- Remove or deprecate `generateAcknowledgment` (no longer used in pipeline)

### 7. Action executor mapping

Extend command catalog entries with `executor: 'client' | 'server'` and `payload` template. Unknown commands default to `executor: 'client'`.

| Command | actionExecutor | Notes |
|---------|----------------|-------|
| `OPEN:CAMERA` | `client` | client opens camera |
| `OFF:LIGHTS` | `client` | client toggles lights |
| `PLAY:MUSIC` | `server` | stub server handler |

`actionName` = command string (e.g. `OPEN:CAMERA`). `actionPayload` = structured object for client/server.

### 8. Layering

```
message.controller  → validate, call createMessage, SuccessResponse.MESSAGE_COMPLETED | MESSAGE_FAILED
message.service     → full pipeline above
message.repository  → CRUD on MessageModel
conversation.repository → active lookup + sequence bump
ollama.service      → classifyIntent, generateConversationResponse, interpretCommand
```

### 9. Testing

- Rewrite `message.service.test.ts`, `message.controller.test.ts` — no poll tests
- Update `message.repository.test.ts` for new fields and `parentId`
- Add conversation repository tests for `findActiveConversation`
- Mock Ollama for intent + conversation + command branches
- `npm test` must pass at 90% coverage

## Risks / Trade-offs

- [Synchronous latency] → POST blocks on intent + main model (~5–35s); acceptable vs poll removal
- [No partial progress API] → client waits; simpler mobile integration
- [Image intent stub] → explicit failure until image pipeline exists
- [Server actions stub] → records placeholder `actionResult`; real handlers later

## Migration Plan

Deploy replaces poll contract — mobile must stop calling `GET /messages/:id`. Existing `messages` documents with old shape are incompatible; dev DB reset acceptable.

## Open Questions

None for v1 — executor mapping uses catalog extension with sensible defaults.
