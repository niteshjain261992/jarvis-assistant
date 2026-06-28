# Interface: client-task-broker (`src/websocket/client-task-broker.ts`)

## Exports

```ts
export interface ClientTaskPersistenceContext {
  messageId: string;
  conversationId: string;
}

export const CLIENT_TASK_TIMEOUT_MS = 10_000;

export function requestFromClient(
  ws: WebSocket,
  action: string,
  input: Record<string, unknown>,
  context?: ClientTaskPersistenceContext,
): Promise<unknown>;

export function resolveClientTask(requestId: string, result: unknown): void;
export function rejectClientTask(requestId: string, error: string): void;
```

## Guarantees

### `requestFromClient`

- Uses `context.messageId` as `requestId` when context provided; otherwise `crypto.randomUUID()`.
- Sends `actionRequestEnvelope(...)` JSON frame on the WebSocket (see `interfaces/message-envelope.md`).
- Returns a Promise resolved by `resolveClientTask` or rejected by `rejectClientTask` / timeout.
- When `context` provided: updates assistant message row to `type: 'action'`, `status: 'pending'` before send; persistence errors are logged, non-fatal.

### `resolveClientTask` / `rejectClientTask`

- Look up `requestId` in module-level `Map`; unknown/already-settled IDs are no-ops.
- When entry has `messageId`: `resolve` → `status: 'completed'` + `actionResult`; `reject`/timeout → `status: 'failed'` + `errorDetails`.
- Persistence errors logged; in-memory promise still settles.

### Timeout

- `CLIENT_TASK_TIMEOUT_MS` (10s); pending entry removed before reject; late resolve is no-op.

## Inbound routing

`messages.gateway.ts` routes `{ type: 'client_task_result' }` and `{ type: 'client_task_error' }` to this broker before chat prompt handling.

## Related

- See `interfaces/websocket.md` for inbound frame shapes.
- See `interfaces/message.md` for pipeline passing `{ messageId: assistantMessageId, conversationId }`.
