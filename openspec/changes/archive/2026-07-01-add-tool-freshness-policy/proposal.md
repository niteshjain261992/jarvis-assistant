## Why

The agent replays prior conversation turns as `Human`/`AI` messages via `buildAgentMessages`, so a repeated request (e.g. "what's the weather outside?" asked twice) shows the model its own earlier answer sitting in context. Combined with `TOOL_USE_POLICY`'s blanket "prefer a direct text answer, do not call a tool" instruction, the model reuses the stale answer instead of re-calling `web_search`, and would do the same for device actions like `play_music`. There is currently no concept in the system prompt that some tool results expire or that some tools are actions that must always run. Fixing this now prevents users from receiving stale weather/news answers or silently-skipped device actions on repeat requests.

## What Changes

- Add a required `freshness: { refetchRequired: boolean; reason: string }` field to every tool's `*Metadata` object (`webSearchMetadata`, `playMusicMetadata`, `openCameraMetadata`, `offLightsMetadata`), declared via a new shared `ToolFreshness` type in `src/agent/tools/types.ts`.
- Set `refetchRequired: true` for all four existing tools (web_search is time-sensitive; the three device tools are actions that must always execute), each with a human-readable `reason`.
- Add `getToolFreshnessRules()` to `src/agent/tools/registry.ts`, sourced from the same metadata table the registry already maintains, so the freshness list stays in sync with registered tools automatically.
- Reword `TOOL_USE_POLICY` in `src/agent/agent-runner.ts` so it no longer unconditionally discourages tool calls: conversational requests still get a direct text answer, but requests needing real-time information or a device action must call the appropriate tool, including on repeat requests.
- Generate a new "Tool freshness rules" section in `buildAgentSystemPrompt` by iterating `getToolFreshnessRules()`, instructing the model to re-call refetch-required tools rather than reuse an earlier answer from history. Omit the section entirely if no tool requires refetching.
- Binary freshness only in this change — no `ttlMinutes` / time-window logic, no timestamps added to `buildAgentMessages`. The type and prompt-generation shape are structured so a future optional `ttlMinutes` field can be added additively (see `design.md`).

## Capabilities

### New Capabilities

(none — this extends existing capabilities)

### Modified Capabilities

- `agent-tools`: every tool's metadata gains a required `freshness` field; the registry exposes `getToolFreshnessRules()` derived from tool metadata.
- `agent-runner`: `buildAgentSystemPrompt` generates a freshness-rules section from the tool registry, and `TOOL_USE_POLICY` is reworded so real-time/action tools are re-called on repeat requests instead of answered from conversation history.

## Impact

- `src/agent/tools/types.ts` — new `ToolFreshness` type; `ToolMetadata` (or per-tool `*Metadata` typing) extended to require `freshness`.
- `src/agent/tools/web-search.tool.ts`, `open-camera.tool.ts`, `off-lights.tool.ts`, `play-music.tool.ts` — each `*Metadata` gains a `freshness` field.
- `src/agent/tools/registry.ts` — new `getToolFreshnessRules()` export.
- `src/agent/agent-runner.ts` — reworded `TOOL_USE_POLICY`, `buildAgentSystemPrompt` generates the freshness section.
- `tests/agent/tools/registry.test.ts`, `tests/agent/tools/*.tool.test.ts`, `tests/agent/agent-runner.test.ts` — updated/added coverage.
- No changes to tool execution, persistence, WebSocket contract, or `buildAgentMessages`.
