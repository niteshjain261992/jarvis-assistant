## ADDED Requirements

### Requirement: Error-level pipeline failure observability

At default `LOG_LEVEL=info`, the message pipeline SHALL emit structured `error` and `warn` entries for failure paths defined in `message-pipeline-logging`, using the shared pino logger. Error logs SHALL use the `{ err }` field for thrown errors. Pipeline failure logs SHALL use consistent field names (`conversationId`, `userMessageId`, `assistantMessageId`, `pipelineStage`, `intent`, `errorDetails`) and SHALL avoid logging full user prompts or model response bodies.

#### Scenario: Pipeline errors visible at info level

- **WHEN** the application runs with `LOG_LEVEL=info` and `createMessage` throws after persisting messages
- **THEN** an error-level pipeline failure log is written

#### Scenario: Expected failures visible at info level

- **WHEN** the application runs with `LOG_LEVEL=info` and `createMessage` returns a failed result for unsupported image intent
- **THEN** a warn-level pipeline failure log is written

#### Scenario: Debug pipeline logs unchanged

- **WHEN** the application runs with `LOG_LEVEL=debug` and a successful `POST /messages` request is processed
- **THEN** existing debug checkpoint logs still appear alongside any error or warn entries on failure paths
