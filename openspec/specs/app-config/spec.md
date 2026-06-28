# app-config Specification

## Purpose

Define how the application loads, validates, and exposes environment configuration so the process fails fast on misconfiguration and developers can set up environments easily.

## Requirements

### Requirement: Validated typed environment configuration

The system SHALL load environment variables (via dotenv) and validate them against a schema exactly once at startup in `src/config/env.ts`, exporting an immutable, fully typed `env` object. At minimum the schema SHALL define `NODE_ENV` (`development` | `production` | `test`, default `development`) and `PORT` (coerced positive integer, default `3000`).

#### Scenario: Valid environment

- **WHEN** the process starts with `PORT=4000`
- **THEN** `env.PORT` is the number `4000` and the application uses it for listening

#### Scenario: Invalid environment fails fast

- **WHEN** the process starts with an invalid value (e.g., `PORT=abc`)
- **THEN** the process exits immediately at startup with a readable validation error identifying the offending variable

### Requirement: Environment example file

The repository SHALL include a `.env.example` documenting every required environment variable with safe placeholder values, and real `.env` files SHALL be git-ignored.

#### Scenario: New developer setup

- **WHEN** a developer copies `.env.example` to `.env` and starts the dev server
- **THEN** the application boots successfully with default development settings

### Requirement: Ollama connection configuration

The environment schema SHALL define `OLLAMA_BASE_URL` (valid URL, default `http://localhost:11434`) and `OLLAMA_MODEL` (non-empty string, default `llama3.1:8b`), validated at startup like all other variables and documented in `.env.example`.

#### Scenario: Defaults applied

- **WHEN** the process starts without `OLLAMA_BASE_URL` or `OLLAMA_MODEL` set
- **THEN** `env.OLLAMA_BASE_URL` is `http://localhost:11434` and `env.OLLAMA_MODEL` is `llama3.1:8b`

#### Scenario: Invalid Ollama URL fails fast

- **WHEN** the process starts with `OLLAMA_BASE_URL=not-a-url`
- **THEN** the process exits immediately at startup with a readable validation error identifying `OLLAMA_BASE_URL`

### Requirement: Log level configuration

The environment schema SHALL define `LOG_LEVEL` as an enum of pino levels (`fatal` | `error` | `warn` | `info` | `debug` | `trace`) with default `info`, validated at startup like all other variables and documented in `.env.example`.

#### Scenario: Default applied

- **WHEN** the process starts without `LOG_LEVEL` set
- **THEN** `env.LOG_LEVEL` is `info`

#### Scenario: Invalid level fails fast

- **WHEN** the process starts with `LOG_LEVEL=verbose`
- **THEN** the process exits immediately at startup with a readable validation error identifying `LOG_LEVEL`

### Requirement: MongoDB connection configuration

The environment schema SHALL define `MONGODB_URI` (non-empty connection string, default `mongodb://127.0.0.1:27017`) and `MONGODB_DATABASE` (non-empty string, default `jarvis`), validated at startup and documented in `.env.example`.

#### Scenario: Defaults applied

- **WHEN** the process starts without `MONGODB_URI` or `MONGODB_DATABASE` set
- **THEN** `env.MONGODB_URI` is `mongodb://127.0.0.1:27017` and `env.MONGODB_DATABASE` is `jarvis`

#### Scenario: Invalid MongoDB URI fails fast

- **WHEN** the process starts with an empty `MONGODB_URI`
- **THEN** the process exits immediately at startup with a readable validation error identifying `MONGODB_URI`

### Requirement: Tavily API key configuration

The environment schema SHALL define `TAVILY_API_KEY` as a required non-empty string (no default), validated at startup like `MONGODB_URI`. The key SHALL be required because `web_search` is a registered server tool — not an optional integration invoked on demand. The variable SHALL be documented in `.env.example`.

#### Scenario: Missing TAVILY_API_KEY fails fast

- **WHEN** the process starts without `TAVILY_API_KEY` set
- **THEN** the process exits immediately at startup with a readable validation error identifying `TAVILY_API_KEY`

#### Scenario: Empty TAVILY_API_KEY fails fast

- **WHEN** the process starts with an empty `TAVILY_API_KEY`
- **THEN** the process exits immediately at startup with a readable validation error identifying `TAVILY_API_KEY`

#### Scenario: Valid TAVILY_API_KEY allows startup

- **WHEN** the process starts with a non-empty `TAVILY_API_KEY`
- **THEN** `env.TAVILY_API_KEY` is the provided string and the application boots successfully

#### Scenario: TAVILY_API_KEY is required unlike optional platform keys

- **WHEN** the env schema is compared to optional keys such as `YOUTUBE_API_KEY`
- **THEN** `TAVILY_API_KEY` has no `.optional()` modifier and startup fails when absent, whereas `YOUTUBE_API_KEY` may be omitted

### Requirement: Qdrant and embedding configuration

The environment schema SHALL define `QDRANT_URL` (valid URL, default `http://localhost:6333`) and `EMBEDDING_MODEL` (non-empty string, default `nomic-embed-text`), validated at startup like all other variables and documented in `.env.example`.

#### Scenario: Defaults applied

- **WHEN** the process starts without `QDRANT_URL` or `EMBEDDING_MODEL` set
- **THEN** `env.QDRANT_URL` is `http://localhost:6333` and `env.EMBEDDING_MODEL` is `nomic-embed-text`

#### Scenario: Invalid Qdrant URL fails fast

- **WHEN** the process starts with `QDRANT_URL=not-a-url`
- **THEN** the process exits immediately at startup with a readable validation error identifying `QDRANT_URL`

### Requirement: Nominatim reverse-geocoding configuration

The environment schema SHALL define `NOMINATIM_BASE_URL` (valid URL, default `https://nominatim.openstreetmap.org`) as an optional, keyless setting, validated at startup like all other variables and documented in `.env.example`. No API key SHALL be required for reverse geocoding.

#### Scenario: Default applied

- **WHEN** the process starts without `NOMINATIM_BASE_URL` set
- **THEN** `env.NOMINATIM_BASE_URL` is `https://nominatim.openstreetmap.org`

#### Scenario: Invalid Nominatim URL fails fast

- **WHEN** the process starts with `NOMINATIM_BASE_URL=not-a-url`
- **THEN** the process exits immediately at startup with a readable validation error identifying `NOMINATIM_BASE_URL`
