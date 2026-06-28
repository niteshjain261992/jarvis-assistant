# Proposal: unify-messages-api

## Why

The restructured message model is conversation-centric, but the HTTP layer still runs the legacy async poll flow (`POST` ack → background command → `GET /messages/:messageId`). Clients should send one prompt and receive the final assistant result in a single synchronous `POST /messages` call, with user and assistant rows persisted per conversation.

## What Changes

- **BREAKING**: Remove `GET /messages/:messageId` and poll envelope codes (`MESSAGE_PROCESSING`, `MESSAGE_ACCEPTED` as interim states)
- **BREAKING**: `POST /messages` becomes a synchronous conversation pipeline (blocks until assistant message is completed or failed)
- Extend `MessageDocument` with `parentId` (assistant → user link); assistant rows are inserted with `status: 'processing'`
- Conversation helpers: get-or-create active conversation, increment `lastSequenceNumber`
- Message repository/service rewrite: dual insert (user + assistant), silent intent classification, branch on conversation vs action
- Ollama service: add `classifyIntent` and conversation response generation; reuse `interpretCommand` for action branch
- Server-side action execution stub for `actionExecutor: 'server'`; `client` actions returned to client in response
- Update tests, envelope codes, and spec-plane docs

## Capabilities

### New Capabilities

- `message-pipeline`: synchronous `POST /messages` flow — active conversation, user/assistant message rows, intent routing, final response payload

### Modified Capabilities

- `async-messages`: replace async ack+poll with single-endpoint synchronous pipeline; remove poll requirement
- `command-interpretation`: command interpretation becomes the action branch of intent routing (no background poll)
- `mongoose-persistence`: message schema adds `parentId`; `actionExecutor` uses `client` (not `mobile_client`); fix `type` enum to `text` (not `conversation`)

## Impact

- **HTTP**: only `POST /messages`; response returns completed assistant message (`type`, `content` or action fields)
- **Code**: model, repositories (message + conversation), service, controller, route, ollama service, api-response, tests
- **Mobile**: no polling; single request/response with action payload for client-executed commands
- **Dependencies**: none (Ollama only)
