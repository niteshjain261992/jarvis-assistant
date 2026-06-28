# Proposal: add-conversation-summary

## Why

Conversations already persist user and assistant messages, but the `summary` field on `conversations` is never updated. Rolling summaries let future context windows stay compact and give the system a durable memory of what happened in a session without re-reading every message on each request.

## What Changes

- Add **Agenda** job queue (MongoDB-backed) for async background work
- After a successful `POST /messages` pipeline, **enqueue** a `update-conversation-summary` job just before the HTTP response is sent — payload includes `conversationId` and the user/assistant exchange text
- **First exchange** in a conversation (no existing `summary`): Ollama summarizes `user: {prompt}\nassistant: {response}` and writes to `conversation.summary`
- **Subsequent exchanges**: load existing `summary`, combine with current exchange, summarize, and **replace** `conversation.summary`
- New Ollama service function for summarization; Agenda worker consumes jobs independently of the request path
- Wire Agenda lifecycle into `server.ts` (start on boot, graceful stop on shutdown)
- Does **not** block or delay the `POST /messages` response

## Capabilities

### New Capabilities

- `conversation-summary`: Event-driven rolling summary updates via Agenda after each completed message exchange

### Modified Capabilities

- `message-pipeline`: Enqueue summary job before returning `MESSAGE_COMPLETED` (completed exchanges only)
- `conversation-repository`: Summary field actively maintained by background worker (behavioral requirement, not just schema)

## Impact

- **Dependencies**: `agenda` (uses existing MongoDB for job store)
- **Code**: `src/config/agenda.ts` (new), `src/jobs/conversation-summary.job.ts` (new), `src/services/conversation-summary.service.ts` (new), `src/services/ollama.service.ts`, `src/services/message.service.ts`, `src/server.ts`, `package.json`
- **HTTP**: No API contract change — `POST /messages` response shape unchanged; summary is internal
- **Tests**: New unit tests for summary service and job handler; update message service tests to assert job enqueue
