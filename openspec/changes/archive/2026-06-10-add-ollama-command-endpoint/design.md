# Design

## Context

The scaffold (archived `init-express-ts-scaffold`) provides the layered architecture, error pipeline, and validated env config. This change adds the first business capability and the first `src/services/` file. Engineering law applies: services contain no Express types, env access only via `env`, errors only via `AppError` + global handler.

## Goals / Non-Goals

**Goals:**

- `POST /command`: natural language in, structured `ACTION:TARGET` command out
- Thin, reusable Ollama client in the service layer
- Deterministic-as-possible output via a constraining system prompt and low temperature

**Non-Goals:**

- Streaming responses, chat history/sessions, multiple intents per prompt
- Command execution (clients act on the returned command; we only interpret)
- Command whitelist/validation of the model's output beyond format normalization (future change)
- Ollama model management (assumes model is already pulled)

## Decisions

### 1. Ollama API: `/api/generate` non-streaming (over `/api/chat`)

Single-turn interpretation needs no conversation state. `POST {OLLAMA_BASE_URL}/api/generate` with `{ model, prompt, system, stream: false, options: { temperature: 0 } }`. The `system` field carries the instruction: respond ONLY with a command in `ACTION:TARGET` format (e.g., `OPEN:CAMERA`), uppercase, no prose.

### 2. Native fetch (no new dependency)

Node 20 ships `fetch`. Timeout via `AbortSignal.timeout(30_000)`. Adding axios/got for one call would violate minimal-dependency sense.

### 3. Service shape

`src/services/ollama.service.ts` exports `interpretCommand(prompt: string): Promise<string>`:

- Builds the generate request, calls Ollama, extracts `response` field
- Normalizes output: trim, strip quotes/backticks, uppercase
- Throws `AppError(502)` on network failure/timeout, non-2xx status, or empty model output
- No Express imports (engineering law)

### 4. Validation at the boundary

zod schema (`prompt`: non-empty trimmed string, max 500 chars) parsed in the controller; failure → `AppError(400)` with the validation message. Express 5 auto-forwards thrown async errors to the global handler, so no try/catch boilerplate.

### 5. Response contract

`200 { "command": "OPEN:CAMERA", "model": "<model used>" }`. Including the model aids debugging across model swaps; cheap and non-breaking.

### 6. Config

`OLLAMA_BASE_URL` (zod `url`, default `http://localhost:11434`) and `OLLAMA_MODEL` (non-empty string, default `llama3.1:8b`) added to the existing schema in `src/config/env.ts`, documented in `.env.example`, per `engineering/config.md` procedure.

## Risks / Trade-offs

- [LLM may emit prose despite instructions] → temperature 0 + strict system prompt + normalization; output-format guarantee stays best-effort and is documented in the spec as such
- [30s fixed timeout may be wrong for slow hardware] → acceptable for now; promote to env var when it bites
- [No allowlist of valid commands] → explicit non-goal; clients must treat commands as untrusted input until a validation change lands
