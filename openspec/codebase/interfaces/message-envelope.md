# Interface: message-envelope (`src/utils/message-envelope.ts`)

## Exports

```ts
export interface MessageEnvelope {
  code: string;
  message: string;
  data: object;
}

export function envelopeFromCreateMessageResult(result: CreateMessageResult): MessageEnvelope;
export function envelopeFromAppError(err: AppError): MessageEnvelope;
export function badRequestEnvelope(message: string): MessageEnvelope;
export function internalServerErrorEnvelope(): MessageEnvelope;
export function actionRequestEnvelope(input: {
  requestId: string;
  actionName: string;
  actionPayload: Record<string, unknown>;
  actionExecutor: MessageActionExecutor;
}): MessageEnvelope;
```

## Guarantees

### `envelopeFromCreateMessageResult`

- `status === 'failed'` → `code: MESSAGE_FAILED`, `data` is full `CreateMessageResult`
- Otherwise → `code: MESSAGE_COMPLETED`, `data` is full `CreateMessageResult`

### `envelopeFromAppError`

- Uses `err.code` and `err.message`; `data: {}`

### `badRequestEnvelope` / `internalServerErrorEnvelope`

- `BAD_REQUEST` and `INTERNAL_SERVER_ERROR` respectively; `data: {}`

### `actionRequestEnvelope`

- `code: ACTION_REQUEST`, `message: 'Action requested'`
- `data`: `{ type: 'action', status: 'pending', requestId, actionName, actionExecutor, actionPayload }`
- Used by `client-task-broker.ts` for outbound client delegation (not chat pipeline completion)

## Related

- Code enums in `interfaces/api-response.md`
- WebSocket usage in `interfaces/websocket.md`
