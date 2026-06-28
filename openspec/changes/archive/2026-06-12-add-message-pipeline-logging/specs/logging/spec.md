## ADDED Requirements

### Requirement: Debug-level pipeline observability

When `LOG_LEVEL` is `debug`, the message pipeline and conversation-summary worker SHALL emit structured debug entries using the shared pino logger. Pipeline logs SHALL use consistent field names (`conversationId`, `intent`, `llmOperation`, `durationMs`, `actionName`, `summaryJob`) and SHALL avoid logging full user prompts or model response bodies.

#### Scenario: Debug logs visible in development

- **WHEN** the application runs with `LOG_LEVEL=debug` and a `POST /messages` request is processed
- **THEN** pipeline checkpoint logs appear in the output

#### Scenario: Pipeline logs suppressed at info level

- **WHEN** the application runs with `LOG_LEVEL=info` (default)
- **THEN** pipeline checkpoint debug entries are not written while error and warn entries still are
