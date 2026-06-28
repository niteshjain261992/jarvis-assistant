## REMOVED Requirements

### Requirement: Command interpretation endpoint

**Reason**: The action path no longer uses a separate Ollama command-parser call (`interpretCommand`). Actions are resolved by LangGraph tool selection in `runAgent`.

**Migration**: Clients continue to receive `type: 'action'` responses with catalog-aligned `actionName` values from agent tools. No REST endpoint changes.

### Requirement: Ollama integration via service layer

**Reason**: `buildCommandSystemPrompt()` and `interpretCommand()` are removed from `ollama.service.ts`. Command parsing is replaced by per-tool LangChain descriptions in `src/agent/tools/`.

**Migration**: Add or change commands by updating agent tool definitions and registry, not the command-interpreter prompt.

### Requirement: Ollama failure handling

**Reason**: Failure handling for command interpretation moves to the agent runner and message pipeline error recovery (`runAgent` catch returns clarify fallback; thrown errors mark assistant failed).

**Migration**: Operational failures surface as `MESSAGE_FAILED` / `LLM_*` codes through the existing pipeline catch path.
