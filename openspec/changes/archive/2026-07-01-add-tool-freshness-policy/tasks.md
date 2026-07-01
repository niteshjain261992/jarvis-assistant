## 1. Shared type

- [x] 1.1 Add `ToolFreshness` interface (`refetchRequired: boolean`, `reason: string`) to `src/agent/tools/types.ts`, structured so an optional `ttlMinutes?: number` can be added later without changing existing fields
- [x] 1.2 Extend the `ToolMetadata` typing (and/or the per-tool `*Metadata` shape) so `freshness: ToolFreshness` is a required field

## 2. Per-tool metadata

- [x] 2.1 Add `freshness: { refetchRequired: true, reason: 'returns real-time information that changes over time' }` to `webSearchMetadata` in `src/agent/tools/web-search.tool.ts`
- [x] 2.2 Add `freshness: { refetchRequired: true, reason: 'is an action that must run each time it is requested' }` to `openCameraMetadata` in `src/agent/tools/open-camera.tool.ts`
- [x] 2.3 Add the same `freshness` field to `offLightsMetadata` in `src/agent/tools/off-lights.tool.ts`
- [x] 2.4 Add the same `freshness` field to `playMusicMetadata` in `src/agent/tools/play-music.tool.ts`
- [x] 2.5 Run `tsc`/build to confirm the required `freshness` field is enforced at compile time on all four tools

## 3. Registry

- [x] 3.1 Add `getToolFreshnessRules(): Array<{ toolName: string; refetchRequired: boolean; reason: string }>` to `src/agent/tools/registry.ts`, deriving entries from the existing `TOOL_METADATA` table (no separate hardcoded list)
- [x] 3.2 Re-export `getToolFreshnessRules` from `src/agent/tools/index.ts`

## 4. Agent runner prompt generation

- [x] 4.1 Reword `TOOL_USE_POLICY` in `src/agent/agent-runner.ts`: keep "conversational requests answered directly with text," add "real-time/device-action requests call the matching tool, including on repeat requests," keep "when unsure, prefer text over guessing a tool"; remove the unconditional "do not call any tool" phrasing
- [x] 4.2 Add a prompt-generation helper (or inline logic) in `agent-runner.ts` that calls `getToolFreshnessRules()`, filters to `refetchRequired: true`, and emits the framing line plus one line per tool (name, reason, re-call instruction)
- [x] 4.3 Update `buildAgentSystemPrompt` to insert the generated freshness section immediately after `TOOL_USE_POLICY` and before the date/time line, omitting the section entirely when no tool requires refetch
- [x] 4.4 Confirm `runAgent`'s call site (`buildAgentSystemPrompt(userContext, input.summary)`) is unchanged

## 5. Specs sync

- [x] 5.1 Confirm delta specs in `openspec/changes/add-tool-freshness-policy/specs/agent-tools/spec.md` and `specs/agent-runner/spec.md` match the implemented behavior (adjust wording only if implementation details diverged)

## 6. Tests — tools

- [x] 6.1 Update `tests/agent/tools/web-search.tool.test.ts` to assert `webSearchMetadata.freshness.refetchRequired === true` with a non-empty `reason`
- [x] 6.2 Update `tests/agent/tools/open-camera.tool.test.ts` to assert `openCameraMetadata.freshness.refetchRequired === true`
- [x] 6.3 Update `tests/agent/tools/off-lights.tool.test.ts` to assert `offLightsMetadata.freshness.refetchRequired === true`
- [x] 6.4 Update `tests/agent/tools/play-music.tool.test.ts` to assert `playMusicMetadata.freshness.refetchRequired === true`
- [x] 6.5 Update `tests/agent/tools/registry.test.ts`: assert `getToolFreshnessRules()` returns one entry per registered tool, each with `refetchRequired` and a non-empty `reason`; assert `web_search` and each device tool have `refetchRequired: true`

## 7. Tests — agent runner

- [x] 7.1 Update `tests/agent/agent-runner.test.ts`: assert `buildAgentSystemPrompt` output contains a freshness-rules section naming `web_search` and instructing the model to call it again on repeat rather than reuse a previous answer
- [x] 7.2 Add a regression assertion that `TOOL_USE_POLICY` does not contain an unconditional "do not call a tool" directive
- [x] 7.3 Add a scratch-registered fake refetch-required tool in a test and confirm it appears in the generated prompt, proving on-the-fly generation rather than a hardcoded list
- [x] 7.4 Confirm existing assertions for persona, date/time, user-context-when-present, and summary-when-present sections still pass

## 8. Verification

- [x] 8.1 Run `npm test` and confirm coverage stays above 90%
- [ ] 8.2 Manual: ask "what's the weather outside?" twice with a short gap; confirm `web_search` is called both times and the second answer is a fresh fetch
- [ ] 8.3 Manual: ask "play some music" twice; confirm `play_music` fires both times
- [ ] 8.4 Manual: ask a durable question twice (e.g. "what is my name?"); confirm it is still answered directly without a tool call, with no regression toward over-calling
