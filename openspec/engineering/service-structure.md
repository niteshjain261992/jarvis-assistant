# Service Structure

Binding law for modular application services in this repo.

## The constraint

- **Multi-step services MUST use an orchestrator + private step/branch functions.** The public entry point delegates; it does not inline every branch.
- **Thrown-error recovery MUST be centralized** when multiple branches share the same cleanup semantics (logging, persistence, re-throw). Do not duplicate identical try/catch blocks.
- **Branch-specific logic MUST live in dedicated private handlers** (e.g. one function per intent type), not nested inline in the orchestrator.
- **Workflow state MUST travel in a typed context object** (IDs, entities, request input) rather than long positional parameter lists.

## Size guidelines

- Public orchestrator: target **≤ 50 lines**; extract before adding behavior if exceeded.
- Private branch handler: target **≤ 60 lines**; extract sub-steps when approaching **~80 lines**.
- When a service file grows beyond **~300 lines**, evaluate splitting by domain — but prefer same-file private functions first (see `message.service.ts`).

## Mechanics

- Services stay free of Express types (`Request`, `Response`). HTTP concerns belong in controllers.
- Private helpers and branch handlers are **unexported** unless a spec explicitly requires a public API.
- Tests validate service behavior through the **public entry point** unless testing a shared utility in `src/utils/`.
- Expected business failures that return without throwing (e.g. unsupported intent) MAY log inline and need not use the thrown-error recovery wrapper.

## Reference implementation

`src/services/message.service.ts`:

| Function | Role |
|----------|------|
| `createMessage` | Public orchestrator |
| `preparePipelineContext` | Setup: conversation resolve + dual message insert |
| `runAgentTurn` | Agent-driven response path via `runAgent` |
| `withPipelineErrorRecovery` | Centralized catch: log → mark assistant failed → rethrow |
| `markAssistantFailed` | Persist failed assistant row |

See also `openspec/specs/service-structure/spec.md` for normative requirements.
