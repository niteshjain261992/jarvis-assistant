# Configuration

Binding law for configuration handling in this repo.

## Environment variables

- All env access goes through the typed `env` object exported by `src/config/env.ts`. Direct `process.env` reads anywhere else are forbidden.
- The env schema is zod; every variable MUST have a type, and either a default or be required.
- Validation happens once at startup. Invalid env = immediate `process.exit(1)` with a readable per-variable report. No lazy/partial validation.
- The exported `env` object is frozen; config is immutable after startup.

## Adding a new variable

1. Add it to the zod schema in `src/config/env.ts` (typed, with default or required).
2. Document it in `.env.example` with a safe placeholder value.
3. Update `openspec/codebase/interfaces/config.md`.

## Files

- `.env` is git-ignored and never committed. `.env.example` is the committed contract.
- Current variables: `NODE_ENV` (`development` | `production` | `test`, default `development`), `PORT` (positive int, default `3000`), `OLLAMA_BASE_URL` (URL, default `http://localhost:11434`), `OLLAMA_MODEL` (non-empty string, default `llama3.1:8b`), `LOG_LEVEL` (`fatal` | `error` | `warn` | `info` | `debug` | `trace`, default `info`).
