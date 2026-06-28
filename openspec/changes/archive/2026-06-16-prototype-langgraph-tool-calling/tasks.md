## 1. Dependencies

- [x] 1.1 Install `@langchain/langgraph`, `@langchain/ollama`, and `@langchain/core` via npm and record them in `package.json` dependencies

## 2. Prototype script

- [x] 2.1 Create `scripts/prototype-agent.ts` — import `env` from `../src/config/env.js` (relative path; script is outside `src/` and tsconfig `rootDir`)
- [x] 2.2 Instantiate `ChatOllama` with `baseUrl: env.OLLAMA_BASE_URL`, `model: env.OLLAMA_MODEL`, and `temperature: 0`
- [x] 2.3 Define three fake tools with LangChain `tool()` helper:
  - `open_camera` — description from OPEN:CAMERA phrases: `open camera, show camera, turn on camera, start camera, take a photo, take a picture`
  - `off_lights` — description from OFF:LIGHTS phrases: `turn off lights, lights off, switch off lights, kill the lights`
  - `play_music` — description from PLAY:MUSIC phrases: `play music, start music, play some songs, put on music`
  - Each tool handler returns a stub string (e.g. `"ok"`)
- [x] 2.4 Create agent with `createReactAgent` from `@langchain/langgraph/prebuilt`, passing the model and tools
- [x] 2.5 Implement readline CLI loop: prompt for input, invoke agent with `{ messages: [{ role: "user", content: input }] }`, print results
- [x] 2.6 Output formatting: if response messages contain tool calls, print each tool name and parsed arguments; otherwise print the final assistant text content
- [x] 2.7 Wrap invoke in try/catch so errors (including gibberish inputs) log and the loop continues; support `exit` or Ctrl+C to quit

## 3. npm script

- [x] 3.1 Add `"prototype:agent": "tsx scripts/prototype-agent.ts"` to `package.json` scripts

## 4. Manual acceptance (not automated)

- [x] 4.1 Run `npm run prototype:agent` with Ollama running and verify:
  - `"open the camera"` → structured tool call for `open_camera`
  - `"what is my name"` → plain text answer (no tool call)
  - `"asdfgh"` → no crash; loop continues

## Out of scope (do not do)

- Do not import `scripts/prototype-agent.ts` from any `src/` file
- Do not modify `message.service.ts`, `ollama.service.ts`, or `command-catalog.ts`
- Do not add delta specs under `openspec/specs/`
