## ADDED Requirements

### Requirement: Modular message service structure

The message pipeline service (`src/services/message.service.ts`) SHALL implement intent branches as separate private functions (`handleConversationBranch`, `handleActionBranch`, `handleImageBranch`) invoked from a thin `createMessage` orchestrator. Pipeline setup (conversation resolution and dual message insert) SHALL live in a dedicated private function. Thrown pipeline failures SHALL be recovered through a single centralized error-recovery helper.

#### Scenario: Conversation branch isolated

- **WHEN** intent is `conversation`
- **THEN** conversation-specific logic runs in `handleConversationBranch` (or equivalent private function), not inline in `createMessage`

#### Scenario: Action branch isolated

- **WHEN** intent is `action`
- **THEN** action-specific logic runs in `handleActionBranch` (or equivalent private function), not inline in `createMessage`

#### Scenario: Centralized thrown-error recovery

- **WHEN** conversation or action branch throws after messages are persisted
- **THEN** error logging, assistant row failure marking, and re-throw are handled by one shared recovery helper

#### Scenario: Behavior unchanged after refactor

- **WHEN** any existing `POST /messages` scenario from this spec is exercised after modularization
- **THEN** HTTP responses, persistence side effects, and logging semantics match pre-refactor behavior
