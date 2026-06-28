# Proposal: modularize-create-message

## Why

`createMessage` in `src/services/message.service.ts` has grown to ~210 lines with three intent branches, two separate try/catch blocks, and duplicated persistence/logging patterns inline. This hurts readability, makes branch logic harder to test in isolation, and scatters error-recovery code. After recent logging additions, a structural refactor is the right time to extract branch handlers and centralize pipeline error recovery before the file grows further.

## What Changes

- Refactor `createMessage` into a thin orchestrator that delegates to focused private functions
- Extract dedicated handlers for each intent branch: `conversation`, `action`, and `image` (unsupported)
- Extract setup steps: conversation resolution + dual message insert into `preparePipelineContext` (or equivalent)
- Consolidate duplicate try/catch blocks into a single `withPipelineErrorRecovery` helper that logs, marks assistant failed, and re-throws
- Introduce a shared `PipelineContext` type carrying conversation, message IDs, sequences, and prompt through branch handlers
- Add a new **`service-structure`** engineering spec defining modular service conventions for future changes
- Update `message-pipeline` spec to require modular branch structure for the message service
- Update `openspec/codebase/interfaces/message.md` and `openspec/codebase/map.md` to reflect the new internal structure
- **No HTTP or behavioral changes** — same inputs, outputs, logging, and error semantics

## Capabilities

### New Capabilities

- `service-structure`: Binding conventions for modular service design (orchestrator + branch handlers + centralized error recovery)

### Modified Capabilities

- `message-pipeline`: Add requirement that the message service implements intent branches as separate functions with centralized error recovery

## Impact

- **Code**: `src/services/message.service.ts` (refactor only; no API surface change)
- **Specs**: New `openspec/specs/service-structure/spec.md`; delta to `message-pipeline`
- **Docs**: `openspec/codebase/interfaces/message.md`, `openspec/codebase/map.md`, new `openspec/engineering/service-structure.md`
- **Tests**: Existing `tests/services/message.service.test.ts` must pass unchanged behavior; optional minor test organization only
- **HTTP**: No contract change
