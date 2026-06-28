# Add Ollama Command Endpoint

## Why

Jarvis needs its first intelligence feature: turning natural-language user input (e.g., "open camera") into structured device commands (e.g., `OPEN:CAMERA`) that clients can act on. A locally running Ollama instance (port 11434) provides the LLM inference.

## What Changes

- New `POST /command` endpoint accepting `{ "prompt": "<natural language>" }`
- New Ollama service (first file in `src/services/`) that calls the local Ollama HTTP API (`/api/generate`, non-streaming) with a system instruction constraining output to the `ACTION:TARGET` command format
- Response returns the structured command, e.g. `{ "command": "OPEN:CAMERA" }`
- Request body validated (non-empty `prompt` string) → 400 on invalid input
- Ollama unreachable/timeout/error → operational 502 via existing error pipeline
- New env vars: `OLLAMA_BASE_URL` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `llama3.1:8b`)

## Capabilities

### New Capabilities

- `command-interpretation`: natural-language prompt → structured `ACTION:TARGET` command via Ollama, exposed at `POST /command`

### Modified Capabilities

- `app-config`: ADDED requirement — Ollama connection configuration (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`) validated at startup

## Impact

- **New files**: `src/services/ollama.service.ts`, `src/controllers/command.controller.ts`, `src/routes/command.route.ts`
- **Modified files**: `src/config/env.ts` (new vars), `src/app.ts` (mount route), `.env.example`
- **Dependencies**: none added — uses Node 20 native `fetch`
- **Spec plane**: `openspec/specs/command-interpretation/` (new), `app-config` delta; updates to `codebase/map.md`, `codebase/interfaces/` (new `ollama.md`, `http.md` + `config.md` updates), `engineering/config.md` current-variables list
