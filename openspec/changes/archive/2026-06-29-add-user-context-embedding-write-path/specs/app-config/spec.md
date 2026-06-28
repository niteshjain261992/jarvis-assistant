## ADDED Requirements

### Requirement: Qdrant and embedding configuration

The environment schema SHALL define `QDRANT_URL` (valid URL, default `http://localhost:6333`) and `EMBEDDING_MODEL` (non-empty string, default `nomic-embed-text`), validated at startup like all other variables and documented in `.env.example`.

#### Scenario: Defaults applied

- **WHEN** the process starts without `QDRANT_URL` or `EMBEDDING_MODEL` set
- **THEN** `env.QDRANT_URL` is `http://localhost:6333` and `env.EMBEDDING_MODEL` is `nomic-embed-text`

#### Scenario: Invalid Qdrant URL fails fast

- **WHEN** the process starts with `QDRANT_URL=not-a-url`
- **THEN** the process exits immediately at startup with a readable validation error identifying `QDRANT_URL`
