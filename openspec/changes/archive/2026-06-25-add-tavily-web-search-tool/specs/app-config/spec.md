## ADDED Requirements

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
