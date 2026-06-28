# Interface: mongodb (`src/config/mongodb.ts`)

Mongoose-backed MongoDB connection lifecycle. Database access is via Mongoose models in `src/models/`, not this module.

## Exports

```ts
export function connectMongo(uri?: string, databaseName?: string): Promise<void>;
export function disconnectMongo(): Promise<void>;
```

## Guarantees

- Singleton connection: repeated `connectMongo` is a no-op when `mongoose.connection.readyState === 1`.
- Defaults: `uri` → `env.MONGODB_URI`, `databaseName` → `env.MONGODB_DATABASE`.
- `disconnectMongo` is a no-op when already disconnected (`readyState === 0`).
- `disconnectMongo` calls `mongoose.disconnect()` and clears connection state.

## Lifecycle

- `src/server.ts` calls `connectMongo()` before `app.listen`, `disconnectMongo()` during graceful shutdown.
- Tests may pass explicit URI/database (e.g. `mongodb-memory-server`).

## Error modes

- Connection failures propagate from Mongoose; server startup exits via `main().catch`.
