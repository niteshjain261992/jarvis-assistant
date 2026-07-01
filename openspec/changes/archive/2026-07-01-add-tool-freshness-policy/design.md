## Context

`buildAgentMessages` (`src/agent/agent-runner.ts`) replays completed prior turns as `HumanMessage`/`AIMessage` history before the current prompt. When a user repeats a request the model already answered, that earlier answer is sitting in context. `TOOL_USE_POLICY` currently reads "Most user requests are conversational — reply with a direct text answer and do not call any tool," which gives the model a rational excuse to reuse the stale answer rather than re-invoke `web_search`, or worse, skip a device action like `play_music` on a repeat request. The system prompt has no notion that some tool results are perishable or that some tools are actions rather than lookups.

The model in production is Ollama-hosted `gemma4:12b`, a local ~12B model. Any fix that relies on the model comparing timestamps or computing elapsed time is fragile at this model size — timestamp arithmetic is exactly the kind of subtle-failure task small local models get wrong intermittently, which would reintroduce the bug non-deterministically rather than fixing it.

## Goals / Non-Goals

**Goals:**
- Give every tool a declarative, required freshness policy expressed as data on its metadata object.
- Derive a "Tool freshness rules" section of the system prompt on the fly from the tool registry, so it can never drift from the actual set of registered tools.
- Reword `TOOL_USE_POLICY` so the "just answer conversationally" default no longer overrides the need to re-fetch real-time data or re-run device actions.
- Keep the rule binary (`refetchRequired: true | false`) so a 12B local model can apply it without arithmetic.

**Non-Goals:**
- No `ttlMinutes` or time-window staleness logic in this change.
- No timestamps added to `buildAgentMessages` or message documents.
- No caching layer — there is no cache today; the bug is the model re-reading its own prior answer from replayed history, not a stale cache entry.
- No changes to tool execution, `withToolPersistence`, `requestFromClient`, or the WebSocket contract.

## Decisions

### Binary freshness (`refetchRequired: boolean`), not TTL

Each tool declares `refetchRequired: true | false` plus a `reason` string. No numeric expiry window. This is deliberate: a local ~12B model asked to compute "has more than N minutes passed since this message's timestamp" is unreliable, and unreliable staleness math would reintroduce the original bug intermittently instead of fixing it. A binary "always re-fetch real-time results and actions on repeat; freely reuse durable results" rule is simple enough for the model to follow consistently.

**Alternative considered:** `ttlMinutes` per tool with timestamped history messages. Rejected for this change because it requires (a) timestamping every replayed message and (b) the model doing time-delta arithmetic — both add complexity and a new failure mode for exactly the model size in production. Deferred, not abandoned (see Future-proofing below).

### Freshness lives on tool metadata, not a separate config table

Each `*.tool.ts` file already exports a `*Metadata` const (`webSearchMetadata`, `openCameraMetadata`, etc.) that is the single source of truth for that tool's static properties (`commandName`, `phrases`, `executor`, `clientTimeoutMs`). Adding `freshness` there keeps one declaration site per tool and makes the registry's uniqueness/aggregation pattern (`TOOL_METADATA` in `registry.ts`) reusable for freshness the same way it's reused for command-name/tool-name lookups.

**Alternative considered:** a standalone `FRESHNESS_POLICY` map keyed by tool name in the registry. Rejected because it duplicates data that already lives with each tool and could drift if a tool is added without a matching entry — putting `freshness` on `*Metadata` and typing it as required makes omission a compile error instead of a silent gap.

### Shared `ToolFreshness` type, required field

```ts
export interface ToolFreshness {
  refetchRequired: boolean;
  reason: string;
}
```

Adding `freshness: ToolFreshness` as a required field on the metadata typing means a new tool file cannot compile without declaring it. This is the mechanism that keeps the registry's generated prompt section in sync automatically — there's no way to add a fifth tool and forget to say whether it's refetch-required.

### Registry exposes `getToolFreshnessRules()`, sourced from existing metadata table

```ts
export function getToolFreshnessRules(): Array<{
  toolName: string;
  refetchRequired: boolean;
  reason: string;
}>
```

This reads from the same `TOOL_METADATA` array the registry already builds for `getToolByCommandName`/`getToolMetadataByToolName`, rather than a separately maintained list — so it can't silently fall out of sync when tools are added or removed.

### `buildAgentSystemPrompt` calls the registry itself

`buildAgentSystemPrompt(userContext, summary?)` is already `async` and today has no need for caller-supplied tool data — `runAgent` builds tools separately via `buildToolsForConnection(ws, context)` for LangChain binding. Rather than thread freshness rules through `runAgent`'s call site (which would require `runAgent` to compute rules and pass them down for no other purpose), `buildAgentSystemPrompt` calls `getToolFreshnessRules()` directly. This keeps `runAgent`'s call to `buildAgentSystemPrompt(userContext, input.summary)` unchanged and keeps the registry as the single owner of "what tools exist and their properties."

**Alternative considered:** pass `rules` in as a third parameter to keep `buildAgentSystemPrompt` a pure function of its inputs. Rejected only because there is no other planned caller and no test benefit big enough to justify widening the call site; if a second caller with different tool sets ever appears, switch to passing rules explicitly at that point.

### Prompt generation shape

For each `refetchRequired: true` entry, emit:

```
- <toolName>: <reason>. If the user asks again, call <toolName> again — do not reuse a previous answer from the conversation history.
```

preceded by one framing line:

```
Some tools return information or perform actions that must not be reused from earlier in the conversation:
```

Tools with `refetchRequired: false` are omitted from the section (not listed as "safe to reuse") to keep the prompt lean — silence is the default for durable tools; only refetch-required tools need calling out. If no registered tool requires refetching, the whole section is omitted. The section is inserted immediately after the (reworded) `TOOL_USE_POLICY` line, before date/time.

### `TOOL_USE_POLICY` rewording

Old:
> Most user requests are conversational — reply with a direct text answer and do not call any tool. Only call a tool when the request clearly matches one of the available tool descriptions. When you are unsure, prefer answering with text rather than guessing a tool.

New (keeps the conversational default, removes the blanket anti-tool bias for real-time/action cases):
> Conversational requests that need no external data or device action should be answered directly with text, without calling a tool. When a request needs real-time information or a device action, call the matching tool — including when the same request is repeated, rather than reusing an earlier answer from the conversation. When you are unsure whether a tool applies, prefer answering with text rather than guessing a tool.

## Risks / Trade-offs

- **[Risk]** Rewording `TOOL_USE_POLICY` to be less anti-tool could make the model over-call tools on ambiguous conversational input. → **Mitigation**: keep the "when unsure, prefer text" clause; add a regression test asserting durable/conversational questions ("what is my name?") are still answered without a tool call in the manual verification checklist.
- **[Risk]** A future tool author forgets to update `getToolFreshnessRules()` behavior expectations when adding a tool. → **Mitigation**: `freshness` is a required field on `*Metadata` typing, so the tool won't compile without it, and `getToolFreshnessRules()` is derived from the same `TOOL_METADATA` array already used for uniqueness assertions — there is no second list to forget.
- **[Risk]** Binary freshness can't express "safe to reuse for a few minutes" (e.g. a slowly-changing lookup) — everything is either always-refetch or always-reusable. → **Mitigation**: accepted for this change; the `ToolFreshness` shape and prompt generator are structured so `ttlMinutes` can be added later without reshaping existing fields (see Future-proofing).

## Future-proofing (explicitly deferred, not implemented now)

- `ToolFreshness` may later gain an optional `ttlMinutes?: number`, read alongside `refetchRequired`/`reason`.
- The prompt generator may later render "valid for ~N minutes" for tools with a `ttlMinutes`, paired with timestamps added to replayed messages in `buildAgentMessages`.
- Deferred specifically because `gemma4:12b` (the local model this prompt targets) is unreliable at timestamp/elapsed-time arithmetic; introducing TTL now would trade one intermittent bug for another. Revisit if/when the deployed model is upgraded or a stronger model is used for this reasoning step.

## Open Questions

None — scope, shape, and rationale above are sufficient to implement.
