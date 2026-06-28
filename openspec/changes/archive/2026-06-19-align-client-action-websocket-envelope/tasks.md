## 1. Envelope helper

- [x] 1.1 Add `ACTION_REQUEST` to `successCodes` in `src/utils/api-response.ts` (if not reusing an existing code)
- [x] 1.2 Add `actionRequestEnvelope({ requestId, actionName, actionPayload, actionExecutor })` to `src/utils/message-envelope.ts` returning `MessageEnvelope` with `data.type: 'action'`, `data.status: 'pending'`, and action fields

## 2. Broker update

- [x] 2.1 Update `requestFromClient` in `src/websocket/client-task-broker.ts` to send `JSON.stringify(actionRequestEnvelope(...))` instead of `{ type: 'client_task', ... }`
- [x] 2.2 Map `action` → `actionName`, `input` → `actionPayload`, set `actionExecutor: 'client'`

## 3. Tests and verification

- [x] 3.1 Update `tests/websocket/client-task-broker.test.ts` — assert envelope shape (`code`, `message`, `data`), `data.type === 'action'`, and renamed fields
- [x] 3.2 Run `npm test` and confirm full suite passes
