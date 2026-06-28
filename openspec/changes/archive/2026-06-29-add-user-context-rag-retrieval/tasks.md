## 1. Write-path payload (`src/services/user-context.service.ts`)

- [x] 1.1 In `upsertUserIdentity`, add `text: sentence` to the upserted point's payload (keep `userId`, `type`, `logicalId`, point id, and overwrite semantics unchanged)
- [x] 1.2 In `upsertUserLocation`, add `text: sentence` to the upserted point's payload (keep `userId`, `type`, `logicalId`, point id, and skip-on-missing-coords behavior unchanged)

## 2. Retrieval (`src/services/user-context.service.ts`)

- [x] 2.1 Add `export async function retrieveUserContext(prompt: string, userId: string): Promise<string>`
- [x] 2.2 Guard: when `userId` is empty/falsy, return `''` immediately WITHOUT calling `embedText` or `search`
- [x] 2.3 Embed the prompt via `embedText(prompt)` and call `getQdrantClient().search(COLLECTION_NAME, { vector, limit: 3, filter: { must: [{ key: 'userId', match: { value: userId } }] }, with_payload: true })` — the `userId` filter is MANDATORY
- [x] 2.4 Read each result's `payload.text`, join with newlines, return the result; return `''` when there are no matches
- [x] 2.5 Wrap embed+search in try/catch → `logger.error` → return `''` (non-fatal; caller always gets a usable string)

## 3. Agent prompt + runner (`src/agent/agent-runner.ts`)

- [x] 3.1 Change `buildAgentSystemPrompt` to `async` and add a `userContext: string` parameter alongside `summary`
- [x] 3.2 When `userContext` is non-empty, inject a `Known information about the user:\n${userContext}` section BEFORE the summary section; omit it entirely when empty; keep persona, tool policy, and date/time sections unchanged
- [x] 3.3 Add `userId: string` to the `runAgent` input object type
- [x] 3.4 In `runAgent`, retrieve context before constructing the agent: `let userContext = ''`; `try { userContext = await retrieveUserContext(input.prompt, input.userId); } catch (err) { logger.error(...); userContext = ''; }`
- [x] 3.5 Build `const systemPrompt = await buildAgentSystemPrompt(userContext, input.summary)` and construct `createAgent` AFTER the await (pass the resolved string, not a promise); leave tools, `recursionLimit`, and `resolveAgentRunResult` unchanged

## 4. Pipeline wiring (`src/services/message.service.ts`)

- [x] 4.1 In `runAgentTurn`, resolve the single user once via `findSingleUser` from the user repository
- [x] 4.2 Pass `user?._id ?? ''` as `input.userId` in the `runAgent` call; leave message persistence, sequence numbers, and summary scheduling unchanged

## 5. Tests

- [x] 5.1 `tests/services/user-context.service.test.ts`: `retrieveUserContext` returns `''` for empty `userId` WITHOUT calling `embedText` or `search`
- [x] 5.2 `tests/services/user-context.service.test.ts`: `retrieveUserContext` embeds the prompt and calls `search` with a filter whose `must` includes a `userId` match (assert filter shape)
- [x] 5.3 `tests/services/user-context.service.test.ts`: joins multiple result `payload.text` values with newlines; returns `''` on zero results
- [x] 5.4 `tests/services/user-context.service.test.ts`: returns `''` (not throw) when `embedText` or `search` throws
- [x] 5.5 `tests/services/user-context.service.test.ts`: `upsertUserIdentity` / `upsertUserLocation` include `payload.text` in the upserted point; mock `getQdrantClient().search` and `embedText` (no network)
- [x] 5.6 `tests/agent/agent-runner.test.ts`: async `buildAgentSystemPrompt` includes the user-context section when `userContext` is non-empty and omits it when empty
- [x] 5.7 `tests/agent/agent-runner.test.ts`: `runAgent` calls `retrieveUserContext` with `input.prompt` and `input.userId`, injects the retrieved context into the system prompt, and still answers (empty context) when `retrieveUserContext` throws
- [x] 5.8 `tests/agent/agent-runner.test.ts`: update ALL existing `runAgent` tests to pass the new `userId` input field and to await the now-async `buildAgentSystemPrompt`
- [x] 5.9 `tests/services/message.service.test.ts`: `runAgentTurn` resolves the user and passes `user._id` as `userId`; passes `''` and still completes when `findSingleUser` returns `null`; update existing tests for the `findSingleUser` mock and new `userId` argument

## 6. Verification

- [x] 6.1 `npm test` passes with coverage above 90%; `npm run lint` clean
- [ ] 6.2 Manual: with the seeded user embedded, ask "where am I?" / "what's the weather outside?" → logs show the location NAME in the system prompt sent to the LLM, with NO tool call needed to obtain it
- [ ] 6.3 Manual: ask "what is my name?" → identity context retrieved and answered from it
- [ ] 6.4 Manual: ask an unrelated question ("explain recursion") → answer unaffected by retrieval
- [ ] 6.5 Manual: stop Qdrant, send any prompt → turn still answers, retrieval failure logged, no user context injected, no crash
- [x] 6.6 `grep` confirms `search` is NEVER called without a `userId` filter
- [x] 6.7 `grep` confirms the write-path upsert functions, geocoding, and startup backfill are otherwise UNCHANGED (except the `payload.text` addition)
