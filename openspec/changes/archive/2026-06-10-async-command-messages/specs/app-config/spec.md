# app-config Delta Specification

## ADDED Requirements

### Requirement: MongoDB connection configuration

The environment schema SHALL define `MONGODB_URI` (non-empty connection string, default `mongodb://127.0.0.1:27017`) and `MONGODB_DATABASE` (non-empty string, default `jarvis`), validated at startup and documented in `.env.example`.

#### Scenario: Defaults applied

- **WHEN** the process starts without `MONGODB_URI` or `MONGODB_DATABASE` set
- **THEN** `env.MONGODB_URI` is `mongodb://127.0.0.1:27017` and `env.MONGODB_DATABASE` is `jarvis`

#### Scenario: Invalid MongoDB URI fails fast

- **WHEN** the process starts with an empty `MONGODB_URI`
- **THEN** the process exits immediately at startup with a readable validation error identifying `MONGODB_URI`
