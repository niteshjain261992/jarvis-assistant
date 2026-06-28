# app-config Delta Specification

## ADDED Requirements

### Requirement: Log level configuration

The environment schema SHALL define `LOG_LEVEL` as an enum of pino levels (`fatal` | `error` | `warn` | `info` | `debug` | `trace`) with default `info`, validated at startup like all other variables and documented in `.env.example`.

#### Scenario: Default applied

- **WHEN** the process starts without `LOG_LEVEL` set
- **THEN** `env.LOG_LEVEL` is `info`

#### Scenario: Invalid level fails fast

- **WHEN** the process starts with `LOG_LEVEL=verbose`
- **THEN** the process exits immediately at startup with a readable validation error identifying `LOG_LEVEL`
