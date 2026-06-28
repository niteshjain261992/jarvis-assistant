## MODIFIED Requirements

### Requirement: Client task request correlation

The system SHALL provide `requestFromClient(ws: WebSocket, action: string, input: Record<string, unknown>): Promise<unknown>` in `src/websocket/client-task-broker.ts`. The function SHALL generate a unique `requestId` via `crypto.randomUUID()`, send a JSON text frame using the standard WebSocket `MessageEnvelope` shape (`{ code, message, data }`) produced by `actionRequestEnvelope` from `message-envelope.ts`, and return a Promise that resolves when `resolveClientTask(requestId, result)` is called or rejects when `rejectClientTask(requestId, error)` is called or when the request times out. The envelope `data` object SHALL have `type: 'action'`, `status: 'pending'`, `requestId`, `actionName` (from the `action` argument), `actionExecutor: 'client'`, and `actionPayload` (from the `input` argument).

#### Scenario: Outbound action request envelope

- **WHEN** `requestFromClient` is called with a WebSocket, action `OPEN:CAMERA`, and input `{ target: 'camera' }`
- **THEN** the WebSocket receives a JSON text frame with top-level keys `code`, `message`, and `data`
- **AND** `data.type` is `'action'`
- **AND** `data.actionName` is `'OPEN:CAMERA'`
- **AND** `data.actionPayload` is `{ target: 'camera' }`
- **AND** `data.requestId` is a non-empty string
- **AND** `data.actionExecutor` is `'client'`

#### Scenario: Resolve completes pending request

- **WHEN** `requestFromClient` is in flight and `resolveClientTask(requestId, result)` is called with the matching `requestId`
- **THEN** the returned Promise resolves with `result`

#### Scenario: Reject completes pending request with error

- **WHEN** `requestFromClient` is in flight and `rejectClientTask(requestId, error)` is called with the matching `requestId`
- **THEN** the returned Promise rejects with an error carrying `error`
