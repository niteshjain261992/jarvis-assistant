## 1. Repository

- [x] 1.1 Add `findRecentMessagesByConversationId(conversationId, limit = 10, beforeSequenceNumber?)` — sort `sequenceNumber` desc, limit, reverse for chronological order
- [x] 1.2 Add repository tests — returns last N messages, respects `beforeSequenceNumber`, empty when no prior messages

## 2. Ollama service

- [x] 2.1 Extend `generateConversationResponse(messages, prompt, summary?)` — assemble summary block + history + current prompt per design
- [x] 2.2 Update `tests/services/ollama.service.test.ts` — summary present/absent, history formatting, empty first exchange

## 3. Message pipeline

- [x] 3.1 In conversation branch: call `findRecentMessagesByConversationId(conversation._id, 10, userSequence)` and pass `conversation.summary` to `generateConversationResponse`
- [x] 3.2 Add debug log with `contextMessageCount` and `hasSummary` when entering conversation branch
- [x] 3.3 Update `tests/services/message.service.test.ts` — assert recent-message fetch, summary passed, limit 10

## 4. Verification

- [x] 4.1 `npm test` passes with coverage >= 90%
- [x] 4.2 `npm run build` and `npm run lint` pass

## 5. Spec plane

- [x] 5.1 Update `openspec/codebase/interfaces/ollama.md` and `interfaces/message.md` for new signature and `findRecentMessagesByConversationId`
