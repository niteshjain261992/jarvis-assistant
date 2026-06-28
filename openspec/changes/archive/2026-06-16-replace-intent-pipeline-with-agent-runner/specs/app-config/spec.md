## REMOVED Requirements

### Requirement: Agent runtime environment variable

**Reason**: The message pipeline no longer supports a legacy vs LangGraph toggle. `runAgent` is the only path.

**Migration**: Remove `AGENT_RUNTIME` from `.env` files. No runtime configuration replaces it.
