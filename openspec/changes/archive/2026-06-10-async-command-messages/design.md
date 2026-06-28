# Design

## Context

`POST /acknowledge` (~5s) + `POST /command` (~30s) are separate synchronous endpoints with no persistence. The user chose **MongoDB** for storage and **ack strategy A**: the first response includes a **personalized** Jarvis acknowledgment (Ollama `generateAcknowledgment`) plus `messageId`; command interpretation runs afterward in the background. Engineering law: layered architecture, envelope catalogs, services without Express types, 90% test coverage.

## Goals / Non-Goals

**Goals:**

- One submission (`POST /messages`) → ack + `messageId` in ~5s
- Poll `GET /messages/:messageId` until `completed` or `failed`
- MongoDB document per message with full lifecycle state
- Reuse `generateAcknowledgment` and `interpretCommand` from `ollama.service.ts`

**Non-Goals:**

- WebSockets/SSE (polling only for v1)
- Message history listing, user auth, TTL/cleanup jobs
- Mongoose ODM (native driver + explicit repository is enough)
- Keeping `/acknowledge` or `/command` (removed in this change)

## Decisions

### 1. Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/messages` | Create doc → sync ack → return `messageId` + `text` → start background command |
| `GET` | `/messages/:messageId` | Read doc by string ID; envelope code reflects `status` |

### 2. Ack strategy A (synchronous personalized ack)

`POST /messages` blocks on `generateAcknowledgment(prompt)` before responding (~5–10s). Background job runs only `interpretCommand`. User sees Jarvis text immediately after first response; command arrives on poll without waiting another 30s on the same connection.

If ack fails (LLM error), the request fails with 502 — no `messageId` is returned (document is not created, or is marked `failed` before respond; prefer **no persist on ack failure** to avoid orphan poll targets).

### 3. MongoDB with native driver

- Package: `mongodb` (official driver, no Mongoose)
- Connection: singleton in `src/config/mongodb.ts`, initialized from `server.ts` (side effects stay in entry point); `createApp()` receives a connected client or lazy-getter injected for tests
- Collection: `messages`
- Document `_id`: string UUID (`crypto.randomUUID()`) — poll path uses the same string, no ObjectId conversion
- Fields: `prompt`, `ackText`, `command?`, `model?`, `status` (`processing` | `completed` | `failed`), `errorCode?`, `errorMessage?`, `createdAt`, `updatedAt`

### 4. Layering

```
message.controller  → thin: validate, call service, SuccessResponse
message.service     → createMessage, getMessage, processMessageAsync (private)
message.repository  → insert, findById, update — MongoDB only, no business logic
```

Background processing: after POST responds, `void messageService.processCommand(messageId).catch(...)` logs and sets `failed` on unhandled errors. In-process only (no Bull/Redis for v1).

### 5. Envelope codes per poll state

- `POST` success → `MESSAGE_ACCEPTED`, `data: { messageId, text }`
- `GET` + `processing` → `MESSAGE_PROCESSING`, `data: { messageId, status, text }`
- `GET` + `completed` → `MESSAGE_COMPLETED`, `data: { messageId, status, text, command, model }`
- `GET` + `failed` → `MESSAGE_FAILED`, `data: { messageId, status, text, errorCode }`
- `GET` unknown ID → `404` `NOT_FOUND`

### 6. Config

- `MONGODB_URI` (zod `url` or connection string — use `z.string().min(1)` since `mongodb://` may not pass `z.url()` in all zod versions; validate as non-empty string)
- Default: `mongodb://127.0.0.1:27017` for local dev
- `MONGODB_DATABASE` default `jarvis` — database name separate from URI for clarity in repository

### 7. Testing

- Repository: `mongodb-memory-server` in dedicated test file (or mock collection interface for unit tests)
- Service: mock repository + mock ollama functions
- HTTP: supertest with mocked service — poll flow `processing` → `completed`
- Remove tests for deleted `/acknowledge` and `/command` controllers

### 8. Migration from add-acknowledge-endpoint

That change introduced `/acknowledge`; this change removes it. Archive `add-acknowledge-endpoint` after this ships (or in same PR). `generateAcknowledgment` stays in `ollama.service.ts`.

## Risks / Trade-offs

- [POST still blocks ~5s on ack] → acceptable per strategy A; far better than 35s combined sync flow
- [In-process background jobs lost on crash] → document stays `processing`; client can poll until timeout; retry/TTL is a future change
- [No auth on messageId] → UUID v4 is unguessable enough for v1; auth layer comes later
