## Context

Jarvis today interprets user messages via a custom Ollama HTTP flow in `ollama.service.ts`: intent classification, then—for actions—a structured system prompt from `buildCommandSystemPrompt()` that maps text to `ACTION:TARGET` strings (e.g. `OPEN:CAMERA`). The catalog in `command-catalog.ts` defines three commands with trigger `phrases` arrays.

We want to explore LangGraph's ReAct agent pattern with native LangChain tool-calling before replacing any production path. The prototype must reuse existing Ollama config (`env.OLLAMA_BASE_URL`, `env.OLLAMA_MODEL`) and mirror catalog phrasing so results are comparable to today's parser.

**Spike only — no OpenSpec capability spec changes.** This change does not alter shipped behavior or main specs under `openspec/specs/`.

## Goals / Non-Goals

**Goals:**

- Install `@langchain/langgraph`, `@langchain/ollama`, `@langchain/core`
- Standalone CLI script at `scripts/prototype-agent.ts` runnable via `npm run prototype:agent`
- `ChatOllama` pointed at the same env vars as production
- Three fake tools aligned with catalog commands, descriptions built from `phrases` (same join style as `formatTriggerLine` in `buildCommandSystemPrompt`)
- `createReactAgent` with tools bound to the model
- Readline loop: print tool name + parsed args on tool calls, or final assistant text otherwise
- Manual acceptance: "open the camera" → tool call; "what is my name" → text; "asdfgh" → no crash

**Non-Goals:**

- Importing the script from `src/` or wiring it into WebSocket/REST
- Modifying `message.service.ts`, `ollama.service.ts`, or `command-catalog.ts`
- Automated tests for the prototype
- Syncing delta specs to `openspec/specs/` on archive
- Production error handling, logging, or persistence

## Decisions

### 1. Script location: `scripts/prototype-agent.ts`

**Choice:** Top-level `scripts/` directory, executed with `tsx`, not compiled into `dist/`.

**Rationale:** Keeps spike code out of the production bundle and makes deletion trivial after the experiment.

**Alternative:** Put under `src/experiments/` — rejected because it invites accidental imports and tsc inclusion.

### 2. Env reuse via `src/config/env.ts`

**Choice:** Import `env` from `@/config/env.js` (or relative path that resolves with tsx/tsconfig paths).

**Rationale:** Same Ollama host/model as production; no duplicated defaults.

**Alternative:** Hardcode localhost — rejected; would not match deployed/dev config.

### 3. Tool definitions mirror catalog, not import catalog

**Choice:** Copy 2–3 tool names and phrase-derived descriptions inline in the script (matching `OPEN:CAMERA`, `OFF:LIGHTS`, `PLAY:MUSIC` wording).

**Rationale:** User constraint: do not touch `command-catalog.ts`. Descriptions should read like trigger lines: `"open camera, show camera, turn on camera, …"`.

**Alternative:** Import `COMMAND_CATALOG` — rejected per non-goals (though it would stay DRY).

### 4. Agent: `createReactAgent` from `@langchain/langgraph/prebuilt`

**Choice:** Prebuilt ReAct agent with `ChatOllama` and the fake tools.

**Rationale:** Minimal setup for tool-calling quality validation; standard pattern for llama3.1 + Ollama.

**Alternative:** Custom LangGraph state machine — overkill for a spike.

### 5. CLI output shape

**Choice:** After each `agent.invoke`, inspect the result messages for `tool_calls` (or AIMessage with tool_calls). Print `{ tool: name, args: parsed JSON }` for each call; if none, print the last assistant `content` string.

**Rationale:** Makes it easy to eyeball whether llama3.1 selects the right tool vs free-form reply.

### 6. Tool implementations

**Choice:** Stub handlers that return a fixed string (e.g. `"ok"`) — enough for the agent loop to complete.

**Rationale:** We only care about *selection* and *arguments*, not side effects.

### 7. Dependencies as direct `dependencies` (not devDependencies)

**Choice:** Add LangChain packages to `dependencies` since they are runtime for the script.

**Rationale:** `npm run prototype:agent` needs them at runtime; spike may graduate to production later.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| llama3.1 tool-calling quality may be poor vs custom prompt | This is the purpose of the spike; document results before any prod switch |
| LangChain API drift / version mismatch | Pin versions in package.json; script is isolated |
| Importing `env.ts` pulls MongoDB validation at startup | Acceptable for local CLI; `.env` or defaults apply |
| ReAct agent may loop or hang on gibberish | Wrap invoke in try/catch; print error and continue readline loop |
| `@/` path alias may not resolve in `scripts/` | Use relative import `../src/config/env.js` or ensure tsconfig paths cover `scripts/` |

## Migration Plan

1. `npm install` the three LangChain packages
2. Add script and npm command
3. Ensure Ollama is running with `llama3.1:8b` (or configured model)
4. Run `npm run prototype:agent` and manually test the three prompt classes
5. If spike fails: delete script/deps or leave for reference; no production rollback needed
6. If spike succeeds: separate change to integrate LangGraph into message flow (out of scope here)

## Open Questions

- Should tool schemas include structured args (e.g. `{ target: "camera" }`) or zero-arg tools only? **Default:** match catalog payloads loosely in Zod schema where useful.
- Temperature for ChatOllama? **Default:** `0` to align with current command interpretation.
