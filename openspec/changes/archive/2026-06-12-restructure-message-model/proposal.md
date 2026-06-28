# Proposal: restructure-message-model

## Why

Messages are currently shaped for the legacy async-command flow (`prompt`, `ackText`, `command`). With conversations in place, messages need a richer schema that supports typed content, roles, sequencing within a conversation, and structured action payloads/results.

## What Changes

- **BREAKING (schema only)**: Replace `MessageDocument` fields in `src/models/message.model.ts` with conversation-linked message shape: `conversationId`, `type`, `role`, `sequenceNumber`, `content`, action fields, `model`, `status`, `errorDetails`, timestamps
- Add typed enums: `MessageType`, `MessageRole`, `MessageActionExecutor`; retain `MessageStatus`
- `conversationId` references `conversations` collection (string `_id`, matching `ConversationModel`)
- **Constraint**: change the model file only — do not update repository, service, controller, or test references in this iteration (known compile/test breakage deferred to follow-up)

## Capabilities

### New Capabilities

<!-- none — schema evolution covered by modified mongoose-persistence -->

### Modified Capabilities

- `mongoose-persistence`: redefine `MessageDocument` / message schema fields and enums; repository API alignment deferred

## Impact

- **Code (this iteration)**: `src/models/message.model.ts` only
- **Deferred breakage**: `message.repository.ts`, `message.service.ts`, message tests, and `interfaces/message.md` still reference old fields — expected until next change
- **Dependencies**: none
- **Spec plane**: delta for `mongoose-persistence`; update `interfaces/message.md` model section only (document new shape; repository section unchanged until follow-up)
