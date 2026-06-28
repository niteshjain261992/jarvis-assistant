# Interface: agent-runner (`src/agent/agent-runner.ts`)

## Exports

```ts
export type AgentRunResult =
  | { kind: 'text'; content: string }
  | { kind: 'action'; actionName: string; actionExecutor: 'client' | 'server'; actionPayload: Record<string, unknown> }
  | { kind: 'clarify'; content: string };

export const CLARIFY_FALLBACK: string;
export const CONVERSATION_SYSTEM_PROMPT: string;

export function buildAgentSystemPrompt(summary?: string): string;
export function buildAgentMessages(context: MessageDocument[], prompt: string): BaseMessage[];
export function resolveAgentRunResult(messages: BaseMessage[]): Promise<AgentRunResult>;

export async function runAgent(
  input: { prompt: string; context: MessageDocument[]; summary?: string },
  ws: WebSocket,
  context?: ClientTaskPersistenceContext,
): Promise<AgentRunResult>;
```

## Guarantees

### `runAgent`

- Uses `ChatOllama` from `env.OLLAMA_BASE_URL` and `env.OLLAMA_MODEL` with `temperature: 0`.
- Binds tools via `buildToolsForConnection(ws, context)` from `@/agent/tools/index.js` only.
- Creates a ReAct agent via `createAgent` from `langchain` with `recursionLimit: 5`.
- System prompt combines `CONVERSATION_SYSTEM_PROMPT`, tool-use policy (prefer text over guessing tools), and optional conversation `summary`.
- Context messages filtered through `filterCompletedContextMessages` from `ollama.service.ts`.
- On graph throw or unusable state → `{ kind: 'clarify', content: CLARIFY_FALLBACK }`.

### `resolveAgentRunResult`

- Reads only the last message in the agent graph output.
- When the last message is a `ToolMessage`, parses `ToolHandlerResult` from its content and returns `{ kind: 'action', actionName, actionExecutor, actionPayload }` (no tool registry lookup).
- When the last message is an `AIMessage`, returns `{ kind: 'text', content }` from extracted text.
- Otherwise returns `{ kind: 'clarify', content: CLARIFY_FALLBACK }`.

### `CONVERSATION_SYSTEM_PROMPT`

- Jarvis persona string; also referenced conceptually by `ollama.service.ts` docs but defined here.

## Related

- See `interfaces/agent-tools.md` for tool registry and factories.
- See `interfaces/client-task-broker.md` for `ClientTaskPersistenceContext` and delegation.
- See `interfaces/message.md` for pipeline integration via `runAgentTurn`.
