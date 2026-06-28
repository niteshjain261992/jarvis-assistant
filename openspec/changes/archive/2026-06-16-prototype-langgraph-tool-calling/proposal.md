## Why

The current command pipeline uses a custom Ollama HTTP prompt (`buildCommandSystemPrompt`) that maps user text to `ACTION:TARGET` strings. Before refactoring production code, we need to validate whether LangGraph + LangChain tool-calling with llama3.1 produces reliable structured tool calls for the same intents—and plain text for conversational or nonsensical input—without touching the live message path.

## What Changes

- Add npm dependencies: `@langchain/langgraph`, `@langchain/ollama`, `@langchain/core`
- Create a standalone throwaway script at `scripts/prototype-agent.ts` (outside `src/`, not imported anywhere)
- Wire `ChatOllama` to existing `env.OLLAMA_BASE_URL` and `env.OLLAMA_MODEL` from `src/config/env.ts`
- Define 2–3 fake LangChain tools mirroring `COMMAND_CATALOG` entries (`open_camera`, `off_lights`, `play_music`) with descriptions derived from catalog `phrases`
- Use `createReactAgent` from `@langchain/langgraph/prebuilt` with the model bound to those tools
- Add a readline CLI loop that prints raw tool calls (with parsed args) or final text answers
- Add npm script `"prototype:agent": "tsx scripts/prototype-agent.ts"` to `package.json`

## Capabilities

### New Capabilities

None — this is a spike/prototype only. No new OpenSpec capability specs.

### Modified Capabilities

None — production behavior (`message.service.ts`, `ollama.service.ts`, `command-catalog.ts`) is unchanged.

## Impact

- **Dependencies**: Three new LangChain packages added to `package.json`
- **New file**: `scripts/prototype-agent.ts` (isolated, manual-only)
- **Modified file**: `package.json` (one npm script)
- **Not affected**: All `src/` production services, REST/WebSocket message flow, command interpretation pipeline
