# Proposal: migrate-mongodb-to-mongoose

## Why

Jarvis currently uses the native MongoDB driver with hand-rolled collection access in repositories. Migrating to Mongoose provides schema definitions, typed models, and a standard ODM layer that will simplify evolving document shapes (conversations, messages) and reduce boilerplate as persistence grows.

## What Changes

- Add `mongoose` dependency; remove direct `mongodb` runtime dependency (Mongoose bundles the driver)
- Rewrite `src/config/mongodb.ts` — `connectMongo` / `disconnectMongo` use `mongoose.connect` / `mongoose.disconnect`; remove `getDb()` in favor of Mongoose models
- Add Mongoose schemas/models for `messages` and `conversations` collections
- Refactor `message.repository.ts` and `conversation.repository.ts` to use Mongoose models instead of native `Collection` APIs
- Update repository and config tests (`mongodb-memory-server` stays for integration tests)
- Update spec-plane interface docs (`mongodb.md`, `message.md`, `conversation.md`, `map.md`)

Repository public APIs (`insertMessage`, `findMessageById`, etc.) and HTTP behavior remain unchanged.

## Capabilities

### New Capabilities

- `mongoose-persistence`: Mongoose connection lifecycle, schema/model definitions, and model-backed repository persistence replacing the native driver

### Modified Capabilities

<!-- none — external repository and HTTP contracts are unchanged; persistence implementation switches to Mongoose -->

## Impact

- **Dependencies**: add `mongoose`; remove `mongodb` from `package.json` dependencies (retained transitively via mongoose / mongodb-memory-server)
- **Code**: `src/config/mongodb.ts`, new `src/models/*.ts`, both repositories, `tests/config/mongodb.test.ts`, both repository test files
- **Unchanged**: `src/server.ts` import surface (`connectMongo`/`disconnectMongo`), services, controllers, routes, env schema
- **Spec plane**: new `openspec/specs/mongoose-persistence/spec.md`; update `interfaces/mongodb.md`, `interfaces/message.md`, `interfaces/conversation.md`, `map.md`
