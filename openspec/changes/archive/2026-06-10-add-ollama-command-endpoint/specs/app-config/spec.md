# app-config Specification (Delta)

## ADDED Requirements

### Requirement: Ollama connection configuration

The environment schema SHALL define `OLLAMA_BASE_URL` (valid URL, default `http://localhost:11434`) and `OLLAMA_MODEL` (non-empty string, default `llama3.1:8b`), validated at startup like all other variables and documented in `.env.example`.

#### Scenario: Defaults applied

- **WHEN** the process starts without `OLLAMA_BASE_URL` or `OLLAMA_MODEL` set
- **THEN** `env.OLLAMA_BASE_URL` is `http://localhost:11434` and `env.OLLAMA_MODEL` is `llama3.1:8b`

#### Scenario: Invalid Ollama URL fails fast

- **WHEN** the process starts with `OLLAMA_BASE_URL=not-a-url`
- **THEN** the process exits immediately at startup with a readable validation error identifying `OLLAMA_BASE_URL`
