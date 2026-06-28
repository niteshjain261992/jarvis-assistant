## Why

`resolveAgentRunResult` still scans for an AIMessage with `tool_calls`, matches it to a ToolMessage by `tool_call_id`, and resolves action metadata through the tool registry. Each tool handler already returns a self-contained `ToolHandlerResult` (`commandName`, `executor`, `payload`) in the ToolMessage content, so the registry lookup and tool-call pairing is redundant and brittle.

## What Changes

- Simplify `resolveAgentRunResult` to inspect only the **last message** in the agent graph output.
- When the last message is a `ToolMessage`, parse its content as `ToolHandlerResult` and return `{ kind: 'action', ... }` using fields from that payload (no registry lookup, no AIMessage `tool_calls` scan).
- When the last message is an `AIMessage`, return `{ kind: 'text', content }` as today.
- Remove helper functions and imports that exist only for tool-call pairing (`findLatestToolCallMessage`, `findToolMessage`, `getToolMetadataByToolName`, `getToolByCommandName` usage in resolver).
- Update unit tests and spec/docs to reflect last-message resolution instead of tool-call exchange resolution.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `agent-runner`: Change action resolution requirement from "find AIMessage with `tool_calls` and matching ToolMessage" to "read the last message — ToolMessage → action, AIMessage → text".

## Impact

- **Code**: `src/agent/agent-runner.ts`, `tests/agent/agent-runner.test.ts`
- **Specs**: `openspec/specs/agent-runner/spec.md` (delta)
- **Docs mirror**: `openspec/codebase/interfaces/agent-runner.md` (optional sync in same change)
- **API**: `AgentRunResult` shape unchanged; resolution logic only
- **Dependencies**: Removes runtime dependency on tool registry inside `resolveAgentRunResult`
