# Interface: message (`src/websocket/messages.gateway.ts`, `src/services/message.service.ts`, `src/repositories/message.repository.ts`)

## Flow

1. WebSocket — client sends `{ "prompt": string }` frame → `handleRawMessage` validates → `createMessage(prompt, ws)` runs pipeline → server responds with envelope on same connection
2. Pipeline: resolve active conversation → insert user + assistant rows → `runAgentTurn(ctx, ws)` (LangGraph agent) → enqueue conversation summary job (completed only) → return result mapped to WebSocket envelope
3. Client actions — during agent turn, client-executor tools call `requestFromClient` which sends an `ACTION_REQUEST` envelope and awaits `client_task_result` / `client_task_error` on the same WebSocket (see `interfaces/client-task-broker.md`)

## src/websocket/messages.gateway.ts

See `interfaces/websocket.md` for connection URL, frame contracts, and envelope codes.

- `handleRawMessage`: routes `client_task_result` / `client_task_error` to broker first; otherwise validates prompt via `messageRequestSchema`, calls `createMessage(prompt, ws)`, sends envelope via `message-envelope.ts`.
- On valid request: `logger.debug({ promptLength }, 'Message request accepted')` — no prompt body logged.

## src/schemas/message-request.schema.ts

Shared zod schema for `{ prompt: string }` — trimmed, non-empty, max 500 chars.

## src/services/message.service.ts

```ts
export interface CreateMessageResult {
  conversationId: string;
  type: 'text' | 'action';
  status: 'completed' | 'failed';
  content?: string;
  actionName?: string;
  actionExecutor?: MessageActionExecutor;
  actionPayload?: Record<string, unknown>;
  actionResult?: Record<string, unknown>;
  model?: string;
  errorDetails?: string;
}

export function createMessage(prompt: string, ws: WebSocket): Promise<CreateMessageResult>;
```

- **Public:** `createMessage(prompt, ws)` — thin orchestrator: `preparePipelineContext` → `runAgentTurn(ctx, ws)`.
- **Private pipeline (unexported):**
  - `preparePipelineContext(prompt)` — resolve/create conversation (v1 hardcodes `source: 'mobile'`), dual message insert (assistant row starts `status: 'processing'`), pre-pipeline error logging; returns `PipelineContext`.
  - `runAgentTurn(ctx, ws)` — last 10 prior messages + `conversation.summary` → `runAgent(input, ws, { messageId, conversationId })` from `@/agent/agent-runner.js` → map `text`/`clarify`/`action` outcomes → update assistant → summary enqueue.
  - `withPipelineErrorRecovery(ctx, fn)` — wraps agent turn; logs pipeline failure, calls `markAssistantFailed`, rethrows.
  - `markAssistantFailed(ctx, err)` — persist `status: 'failed'` + `errorDetails` on assistant row.
- `clarify` agent outcomes persist as `type: 'text'`, `status: 'completed'`.
- Client-executor actions: broker sets assistant row `type: 'action'`, `status: 'pending'` during delegation and `status: 'completed'` with `actionResult` on resolve; `runAgentTurn` does not overwrite an already-completed row or its `actionResult`.
- Message IDs are persisted but not returned in the WebSocket envelope `data`.
- Debug pipeline logs (visible when `LOG_LEVEL=debug`): conversation resolved (`conversationId`, `created`), messages persisted, agent turn entered/completed (`contextMessageCount`, `hasSummary`, `agentKind`), action resolved, pipeline completed/failed.
- See `engineering/service-structure.md` for modular service conventions.

## src/services/conversation-summary.service.ts

```ts
export function buildExchangeText(userPrompt: string, assistantText: string): string;
export function formatAssistantText(result: CompletedExchangeResult): string;
export function enqueueConversationSummary(conversationId: string, userPrompt: string, result: CompletedExchangeResult): Promise<void>;
export function processSummaryJob(data: UpdateConversationSummaryJobData): Promise<void>;
```

- `enqueueConversationSummary`: schedules Agenda job with `user: {prompt}\nassistant: {response}`; logs `summaryJob: 'enqueued'` at debug; no-op on failure or when Agenda is not started.
- `processSummaryJob`: first exchange summarizes exchange text; subsequent exchanges combine prior `conversation.summary` with new exchange, then replace `summary`; logs `summaryJob: 'persisted'` and `rolling` at debug.

## src/config/command-catalog.ts

```ts
export type CommandExecutor = 'client' | 'server';

export interface CommandCatalogEntry {
  command: string;
  phrases: readonly string[];
  executor: CommandExecutor;
  payload: Record<string, unknown>;
}

export function getCommandCatalogEntry(command: string): CommandCatalogEntry | undefined;
```

- Catalog provides executor/payload metadata lookup. Agent tool selection uses `src/agent/tools/` definitions.

## src/models/message.model.ts

```ts
export type MessageType = 'text' | 'action' | 'image';
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageActionExecutor = 'assistant' | 'client' | 'server';
export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface MessageDocument {
  _id: string; // UUID
  conversationId: string; // ref → Conversation
  parentId?: string; // ref → parent message
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

export const MessageModel: Model<MessageDocument>;
```

- Collection: `messages`; `conversationId` references `conversations` by string `_id`.

## src/repositories/message.repository.ts

```ts
export function insertMessage(doc: MessageDocument): Promise<MessageDocument>;
export function findMessageById(id: string): Promise<MessageDocument | null>;
export function findMessagesByConversationId(conversationId: string, limit?: number): Promise<MessageDocument[]>;
export function findRecentMessagesByConversationId(
  conversationId: string,
  limit?: number,
  beforeSequenceNumber?: number,
): Promise<MessageDocument[]>;
export function updateMessage(id: string, update: Partial<...>): Promise<void>;
```

- `findRecentMessagesByConversationId` returns the most recent messages in chronological order (desc fetch, reversed). Optional `beforeSequenceNumber` excludes the in-flight exchange.
- Collection: `messages` via `MessageModel` (`src/models/message.model.ts`); connection via `connectMongo` from `interfaces/mongodb.md`.

## src/repositories/conversation.repository.ts

```ts
export function findActiveConversation(source?: ConversationSource): Promise<ConversationDocument | null>;
```

- Used by message pipeline to resolve the active session before inserting message rows.
