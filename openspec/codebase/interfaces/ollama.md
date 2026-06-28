# Interface: ollama (`src/services/ollama.service.ts`)

## Exports

```ts
export function filterCompletedContextMessages(context: MessageDocument[]): MessageDocument[];
export function summarizeText(input: string): Promise<string>;
```

## Guarantees

### `filterCompletedContextMessages`

- Returns messages with `status === 'completed'` and non-empty `content`.
- Shared with agent-runner for bounded conversation context.

### `summarizeText`

- Calls `POST {env.OLLAMA_BASE_URL}/api/generate` with a concise rolling-summary system prompt.
- Temperature 0.2, 15s timeout.
- Returns trimmed summary prose; empty output throws `LLM_EMPTY_RESPONSE`.
- Used by the conversation-summary Agenda worker (not the WebSocket request path).

- Ollama HTTP calls log `llmOperation` at debug on start and `{ llmOperation, durationMs }` on completion. No prompt or response bodies are logged.

- No Express types on any export; safe to call from any layer.

## Error modes (`summarizeText`)

- Network failure or timeout → `AppError` 502 `LLM_UNAVAILABLE`
- Non-2xx Ollama response → `AppError` 502 `LLM_ERROR_RESPONSE`
- Empty model output after normalization → `AppError` 502 `LLM_EMPTY_RESPONSE`

## Related

- Jarvis persona (`CONVERSATION_SYSTEM_PROMPT`) lives in `src/agent/agent-runner.ts`, not this service.
- Message pipeline LLM work is handled by `runAgent` in `src/agent/agent-runner.ts` (LangChain + ChatOllama), not direct Ollama HTTP calls from this service.
