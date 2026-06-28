## Why

The current `classifyIntent` system prompt is a single terse sentence with no definitions or examples. Ambiguous prompts (e.g. "open spotify" vs "what is spotify") are harder for the model to route correctly. A structured classifier prompt with intent definitions and examples should improve branch accuracy without changing the pipeline contract.

## What Changes

- Replace `INTENT_SYSTEM_PROMPT` in `src/services/ollama.service.ts` with the user-provided classifier prompt (definitions for `conversation`, `action`, `image`, plus examples; single-word response)
- Keep existing `parseIntent` behavior, temperature 0, 10s timeout, and `MessageIntent` return type unchanged
- Add/update tests asserting the new system prompt is sent to Ollama
- Sync `openspec/codebase/interfaces/ollama.md` to document the expanded classifier instructions

## Capabilities

### New Capabilities

_None — prompt refinement only._

### Modified Capabilities

- `message-pipeline`: Intent classification requirement SHALL specify structured classifier instructions with per-intent definitions and examples

## Impact

- `src/services/ollama.service.ts` — `INTENT_SYSTEM_PROMPT` constant
- `tests/services/ollama.service.test.ts` — system prompt assertion
- `openspec/codebase/interfaces/ollama.md` — `classifyIntent` guarantee text

No HTTP API changes. No new dependencies. Parsing and branch routing unchanged.
