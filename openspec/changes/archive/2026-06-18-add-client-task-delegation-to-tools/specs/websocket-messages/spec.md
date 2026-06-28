## ADDED Requirements

### Requirement: Client task completion routing

The WebSocket message handler SHALL route inbound frames with `type: 'client_task_result'` or `type: 'client_task_error'` to the client-task broker before any chat prompt validation or `createMessage` pipeline invocation. These frames SHALL NOT be treated as user chat turns.

#### Scenario: client_task_result resolves broker

- **WHEN** a client sends `{ "type": "client_task_result", "requestId": "<id>", "result": <value> }`
- **THEN** `resolveClientTask(requestId, result)` is called
- **AND** `createMessage` is not invoked

#### Scenario: client_task_error rejects broker

- **WHEN** a client sends `{ "type": "client_task_error", "requestId": "<id>", "error": "<message>" }`
- **THEN** `rejectClientTask(requestId, error)` is called
- **AND** `createMessage` is not invoked

#### Scenario: Chat prompts unchanged

- **WHEN** a client sends `{ "prompt": "open the camera" }` without a client-task `type`
- **THEN** the existing message pipeline runs via `createMessage(prompt, ws)` as before

### Requirement: WebSocket pipeline passes connection to agent

`createMessage` SHALL accept the session WebSocket and pass it through to `runAgent` so client-executor tools can delegate to the connected client.

#### Scenario: Gateway passes WebSocket to createMessage

- **WHEN** `handleRawMessage` processes a valid chat prompt frame
- **THEN** it calls `createMessage(prompt, ws)` with the connection's WebSocket instance
