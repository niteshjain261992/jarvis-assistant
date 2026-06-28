# app-config Specification (Delta)

## ADDED Requirements

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
