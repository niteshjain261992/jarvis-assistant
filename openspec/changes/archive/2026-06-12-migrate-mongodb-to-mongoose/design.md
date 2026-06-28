# Design

## Context

Jarvis persists messages and conversations via `src/config/mongodb.ts` (native `MongoClient` + `getDb()`) and thin repositories that call `collection.insertOne` / `findOne` / `updateOne`. `src/server.ts` connects on boot and disconnects on shutdown. Tests use `mongodb-memory-server` with `getDb().collection(...).deleteMany({})` for cleanup.

The user wants to replace the native driver with Mongoose while keeping repository public APIs and HTTP behavior unchanged.

## Goals / Non-Goals

**Goals:**

- Add `mongoose`; remove direct `mongodb` dependency
- Rewrite `connectMongo` / `disconnectMongo` to use Mongoose
- Define Mongoose schemas/models for `messages` and `conversations`
- Refactor repositories to use models; remove `getDb()`
- Update all affected tests and spec-plane docs

**Non-Goals:**

- Changing repository function signatures or service/controller logic
- Adding Mongoose middleware, virtuals, or validation beyond schema enums/required fields
- Renaming `src/config/mongodb.ts` (keep path to minimize churn in `server.ts` imports)
- Data migration scripts (document shapes are identical)

## Decisions

### 1. Keep `mongodb.ts` filename and export names

`connectMongo` and `disconnectMongo` stay as the public connection API used by `server.ts` and tests. Internally they call:

```ts
await mongoose.connect(uri, { dbName: databaseName });
await mongoose.disconnect();
```

Singleton guard: if `mongoose.connection.readyState === 1`, `connectMongo` returns early (same idempotent behavior as today).

`getDb()` is removed — all access goes through models.

### 2. Models in `src/models/`

| File | Model | Collection |
|------|-------|------------|
| `src/models/message.model.ts` | `MessageModel` | `messages` |
| `src/models/conversation.model.ts` | `ConversationModel` | `conversations` |

Each schema mirrors the existing `*Document` interface. Use `_id: { type: String, required: true }` to keep string UUID keys (no ObjectId auto-gen). Export both the schema interface (for typing) and the model.

Repositories import models and map Mongoose lean documents back to existing `*Document` types where needed.

### 3. Repository refactor pattern

**Before (native driver):**
```ts
getDb().collection('messages').insertOne(doc);
getDb().collection('messages').findOne({ _id: id });
getDb().collection('messages').updateOne({ _id: id }, { $set: { ...update, updatedAt } });
```

**After (Mongoose):**
```ts
await MessageModel.create(doc);
await MessageModel.findById(id).lean();
await MessageModel.updateOne({ _id: id }, { $set: { ...update, updatedAt: new Date() } });
```

Public exports (`MessageDocument`, `insertMessage`, etc.) unchanged. Type definitions can move to model files or stay in repositories — prefer exporting document types from models and re-exporting from repositories for backward compatibility within the codebase.

### 4. Dependencies

- Add `mongoose` (latest 8.x compatible with Node 20+)
- Remove `mongodb` from `dependencies` in `package.json`
- Keep `mongodb-memory-server` as devDependency (works with Mongoose via same URI)

### 5. Test updates

| File | Change |
|------|--------|
| `tests/config/mongodb.test.ts` | Replace `getDb()` assertions with `mongoose.connection.readyState` and `mongoose.connection.db.databaseName`; remove `getDb` import |
| `tests/repositories/message.repository.test.ts` | Replace `getDb().collection('messages').deleteMany({})` with `MessageModel.deleteMany({})` |
| `tests/repositories/conversation.repository.test.ts` | Same pattern with `ConversationModel.deleteMany({})` |

Connection setup (`connectMongo(mongod.getUri(), 'test')`) unchanged.

### 6. Files requiring changes (full inventory)

| Path | Action |
|------|--------|
| `package.json` | add mongoose, remove mongodb |
| `src/config/mongodb.ts` | rewrite with mongoose |
| `src/models/message.model.ts` | **new** |
| `src/models/conversation.model.ts` | **new** |
| `src/repositories/message.repository.ts` | use MessageModel |
| `src/repositories/conversation.repository.ts` | use ConversationModel |
| `tests/config/mongodb.test.ts` | mongoose connection assertions |
| `tests/repositories/message.repository.test.ts` | model-based cleanup |
| `tests/repositories/conversation.repository.test.ts` | model-based cleanup |
| `openspec/codebase/interfaces/mongodb.md` | update exports/guarantees |
| `openspec/codebase/interfaces/message.md` | note Mongoose model |
| `openspec/codebase/interfaces/conversation.md` | note Mongoose model |
| `openspec/codebase/map.md` | add models row, update mongodb description |

**Unchanged:** `src/server.ts` (imports only), `src/services/**`, `src/controllers/**`, `src/routes/**`, `src/config/env.ts`

### 7. Alternative considered: rename config to `mongoose.ts`

Rejected — `server.ts` and tests already import from `mongodb.ts`; renaming adds noise without user benefit. File can be renamed in a follow-up if desired.

## Risks / Trade-offs

- [Mongoose schema strictness] → Use `strict: true` (default); optional fields match current behavior with `required: false` or omitted
- [Lean vs hydrated documents] → Use `.lean()` on reads to get plain objects close to current `*Document` shape; avoids Mongoose document method surprises in tests
- [Transitive mongodb version] → Mongoose pins its own driver version; mongodb-memory-server compatibility should be verified in tests
- [Slightly larger dependency tree] → Acceptable trade-off for schema tooling as collections grow

## Migration Plan

1. Add mongoose, create models
2. Rewrite connection module
3. Refactor repositories one at a time
4. Update tests
5. Remove mongodb from dependencies
6. Run `npm test`, `npm run build`, `npm run lint`

No production data migration needed — document field names and collection names are unchanged. Rollback: revert commit and restore native driver.

## Open Questions

None — user provided clear implementation steps.
