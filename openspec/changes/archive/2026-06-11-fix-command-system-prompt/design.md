## Context

`interpretCommand` uses `COMMAND_SYSTEM_PROMPT` to constrain Ollama output to a single `ACTION:TARGET` string. The opening line currently reads *"You are a command interpreter for a home assistant."* — leftover from early prototyping. The product is **Jarvis**: acknowledgment already uses a Jarvis persona (`ACKNOWLEDGMENT_SYSTEM_PROMPT`), and command interpretation runs in the async message pipeline behind the same user-facing experience.

## Goals / Non-Goals

**Goals:**

- Replace "home assistant" framing with **Jarvis agent** in `COMMAND_SYSTEM_PROMPT`.
- Preserve the strict output contract (one `ACTION:TARGET`, uppercase, no prose).
- Lock the persona in tests and spec plane docs.

**Non-Goals:**

- Changing acknowledgment prompt, timeouts, temperature, or normalization logic.
- API, envelope, or MongoDB changes.
- Broader prompt engineering (new examples, allowlists, multi-command support).

## Decisions

### 1. Prompt wording

Replace the first line with:

> `You are the command interpreter for the Jarvis personal agent.`

Keep the remaining lines (format rules, examples, "ONLY the command") unchanged so behavior stays predictable.

**Alternative considered:** Mirror the full Jarvis personality from the ack prompt — rejected because command interpretation needs a terse, deterministic system role; wit/persona belongs in acknowledgment only.

### 2. Verification

- Extend `tests/services/ollama.service.test.ts` `interpretCommand` test to assert `body.system` contains `Jarvis` (same pattern as the ack test).
- Update `openspec/codebase/interfaces/ollama.md` guarantee text.

No new files; single-string change in `ollama.service.ts`.

## Risks / Trade-offs

- [Model behavior drift] → Mitigation: output contract and examples unchanged; normalization unchanged; existing ollama tests still pass.
- [Over-personalizing command path] → Mitigation: one-line identity only; no "Sir" or prose instructions on command prompt.
