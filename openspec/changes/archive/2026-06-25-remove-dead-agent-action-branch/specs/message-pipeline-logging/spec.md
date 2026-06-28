## MODIFIED Requirements

### Requirement: Intent and branch logging

After the agent turn starts, the pipeline SHALL log the agent outcome kind and relevant context counts.

#### Scenario: Agent turn entered

- **WHEN** `runAgentTurn` begins processing
- **THEN** a debug log is emitted with `conversationId`, `contextMessageCount`, and whether a conversation summary is present

#### Scenario: Agent turn completed

- **WHEN** `runAgent` returns and the assistant row is updated
- **THEN** a debug log is emitted with `conversationId`, `agentKind` (`text` or `clarify`), and resulting assistant `type`

#### Scenario: Pipeline completed

- **WHEN** `createMessage` returns a completed or failed result
- **THEN** a debug log is emitted with `conversationId`, `type`, and `status`

## REMOVED Requirements

### Requirement: Action resolved log after agent turn

**Reason**: The `kind: 'action'` branch in `runAgentTurn` is removed. Action persistence and logging occur in `client-task-broker.ts` during tool delegation, not after agent resolution.

**Migration**: No replacement needed in message-pipeline-logging; broker-level logging covers action lifecycle.
