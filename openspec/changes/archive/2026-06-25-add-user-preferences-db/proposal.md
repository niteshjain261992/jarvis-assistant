## Why

Jarvis needs durable storage for user identity, learned preferences, and location history so future agent turns can personalize responses and context. The schema for three collections (`Users`, `user_preferences`, `location_history`) is defined upfront; this change lays the Mongoose model and repository foundation without wiring it into services, routes, or the agent pipeline yet.

## What Changes

- Add three Mongoose model modules under `src/models/` for MongoDB collections `Users`, `user_preferences`, and `location_history`.
- Add repository modules under `src/repositories/` with CRUD operations for users, user preferences, and location history.
- Reuse the existing MongoDB connection (`connectMongo` / `env.MONGODB_*`) — no new database, env vars, or dependencies.
- Add Jest integration tests for all three repositories using `mongodb-memory-server` (same pattern as conversation repository tests).
- **No integration**: `server.ts`, `app.ts`, services, controllers, agent runner, and WebSocket gateway remain untouched.

## Capabilities

### New Capabilities

- `user-repository`: Typed `Users` collection document shape and repository CRUD (insert, find by id, update profile/location fields, touch `last_active`).
- `user-preference-repository`: Typed `user_preferences` documents linked to `Users` id with category/value/weight and query-by-user operations.
- `location-history-repository`: Typed `location_history` documents linked to `Users` id with append and query-by-user (ordered by timestamp) operations.

### Modified Capabilities

- `mongoose-persistence`: Extend with Mongoose schemas/models for the three new user-profile collections.

## Impact

- **Code (new)**: `src/models/user.model.ts`, `src/models/user-preference.model.ts`, `src/models/location-history.model.ts`, `src/repositories/user.repository.ts`, `src/repositories/user-preference.repository.ts`, `src/repositories/location-history.repository.ts`
- **Code (modify)**: none (`package.json`, `.env.example`, `src/config/env.ts` unchanged)
- **Tests (new)**: `tests/repositories/user.repository.test.ts`, `tests/repositories/user-preference.repository.test.ts`, `tests/repositories/location-history.repository.test.ts`
- **Dependencies**: none (existing `mongoose` + `mongodb-memory-server`)
- **Non-impact**: Message/conversation pipeline, HTTP/WebSocket APIs, agent tools, server startup unchanged
