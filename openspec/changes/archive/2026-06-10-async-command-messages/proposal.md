# Proposal: async-command-messages

## Why

The mobile app currently calls `POST /acknowledge` then `POST /command` — two round trips and ~35s of total LLM latency. Jarvis should feel responsive: return a personalized acknowledgment and a `messageId` in one response (~5s, ack strategy A), then let the client poll while command interpretation runs in the background and is persisted in MongoDB.

## What Changes

- **BREAKING**: Remove `POST /acknowledge` and `POST /command`; replace with async message flow
- New `POST /messages` — accepts `{ "prompt": string }`, creates a MongoDB document, generates Jarvis ack text synchronously (strategy A), returns `{ messageId, text }`, kicks off background `interpretCommand`
- New `GET /messages/:messageId` — poll by ID; returns `status` (`processing` | `completed` | `failed`) plus `text`, and on completion `command` + `model`, or on failure `errorCode`
- MongoDB via official `mongodb` driver: `MONGODB_URI` env var, `src/config/mongodb.ts` client, `src/repositories/message.repository.ts`
- New `message.service.ts` orchestrates create → ack → background process → poll
- New envelope codes: `MESSAGE_ACCEPTED`, `MESSAGE_PROCESSING`, `MESSAGE_COMPLETED`, `MESSAGE_FAILED`
- Tests with mocked repository + HTTP integration; optional `mongodb-memory-server` for repository integration tests

## Capabilities

### New Capabilities

- `async-messages`: combined ack + async command pipeline with MongoDB persistence and poll-by-ID

### Modified Capabilities

- `command-interpretation`: interpretation becomes a background step in the message pipeline (no standalone `POST /command`)
- `app-config`: add `MONGODB_URI` (and optional `MONGODB_DATABASE`) to the env schema

## Impact

- **Dependencies**: `mongodb` (runtime); `mongodb-memory-server` (dev, for repository tests)
- **Code**: new config/repository/service/controller/route; remove acknowledge + command HTTP layers; update `app.ts`, `api-response.ts`, `env.ts`, `.env.example`
- **Spec plane**: new `openspec/specs/async-messages/spec.md`; deltas for `command-interpretation`, `app-config`; updates to `map.md`, interfaces
- **Mobile**: single `POST /messages` then poll `GET /messages/:id` — replaces two-endpoint flow
