# Interface: config (`src/config/env.ts`)

## Exports

```ts
export const env: Readonly<{
  NODE_ENV: 'development' | 'production' | 'test'; // default 'development'
  PORT: number; // positive int, default 3000
  OLLAMA_BASE_URL: string; // valid URL, default 'http://localhost:11434'
  OLLAMA_MODEL: string; // non-empty, default 'llama3.1:8b'
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'; // default 'info'
  MONGODB_URI: string; // non-empty, default 'mongodb://127.0.0.1:27017'
  MONGODB_DATABASE: string; // non-empty, default 'jarvis'
}>;

export const isProduction: boolean;
```

## Guarantees

- Importing this module loads `.env` (dotenv) and validates `process.env` exactly once.
- `env` is frozen; mutation throws in strict mode.
- Defaults applied when variables are absent: `NODE_ENV=development`, `PORT=3000`, `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=llama3.1:8b`, `LOG_LEVEL=info`, `MONGODB_URI=mongodb://127.0.0.1:27017`, `MONGODB_DATABASE=jarvis`.

## Error modes

- Invalid/missing variables → prints per-variable report to stderr and `process.exit(1)`. The module never exports a partially valid config.
