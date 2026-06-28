## ADDED Requirements

### Requirement: Agent runtime environment variable

The environment schema SHALL define `AGENT_RUNTIME` as `legacy` | `langgraph` with default `legacy`, validated at startup like other enum variables and documented in `.env.example`. No production code path SHALL read this variable in this change except validation and tests.

#### Scenario: Default applied

- **WHEN** the process starts without `AGENT_RUNTIME` set
- **THEN** `env.AGENT_RUNTIME` is `legacy`

#### Scenario: Langgraph value accepted

- **WHEN** the process starts with `AGENT_RUNTIME=langgraph`
- **THEN** `env.AGENT_RUNTIME` is `langgraph`

#### Scenario: Invalid value fails fast

- **WHEN** the process starts with `AGENT_RUNTIME=experimental`
- **THEN** the process exits immediately at startup with a readable validation error identifying `AGENT_RUNTIME`
