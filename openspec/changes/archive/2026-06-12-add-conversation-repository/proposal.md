# Proposal: add-conversation-repository

## Why

Jarvis needs a durable conversation model before services and HTTP endpoints can group messages into sessions. Adding a MongoDB repository layer now establishes the document shape and persistence primitives without coupling the rest of the app prematurely.

## What Changes

- New `src/repositories/conversation.repository.ts` — types and CRUD helpers for a `conversations` collection
- Document fields: `title`, `source` (`mobile` | `cli` | `api`), `status` (`active` | `idle` | `archived` | `error`, default `active`), `summary`, `lastSequenceNumber` (default `0`), `createdAt`, `updatedAt`
- Repository integration tests with `mongodb-memory-server`, mirroring `message.repository` patterns
- **Constraint**: no imports of the conversation repository from services, controllers, routes, or `app.ts` — layer only

## Capabilities

### New Capabilities

- `conversation-repository`: MongoDB persistence for conversation documents with typed `source` and `status` enums, insert/find/update operations, and repository-level tests

### Modified Capabilities

<!-- none — no existing spec-level behavior changes -->

## Impact

- **Code**: one new repository module and matching test file; no HTTP or service changes
- **Dependencies**: none (reuses existing `mongodb` and `mongodb-memory-server`)
- **Spec plane**: new `openspec/specs/conversation-repository/spec.md`; new `openspec/codebase/interfaces/conversation.md`; update `openspec/codebase/map.md`
