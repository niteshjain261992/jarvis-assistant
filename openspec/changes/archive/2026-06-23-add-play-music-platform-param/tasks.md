## 1. Add platform to play music tool

- [x] 1.1 Export `DEFAULT_MUSIC_PLATFORM = 'youtube'` and a `normalizePlatform()` helper in `src/agent/tools/play-music.tool.ts`
- [x] 1.2 Add `platform` to the Zod schema with `.default('youtube')` and describe accepted platforms (youtube, spotify, apple_music, amazon_music, soundcloud, others)
- [x] 1.3 Update handler to accept `{ query, platform }`, normalize platform, and include it in `requestFromClient` payload and returned `ToolHandlerResult.payload`
- [x] 1.4 Update tool description to instruct inferring platform from user phrasing; default youtube when unspecified

## 2. Update tests

- [x] 2.1 Update `tests/agent/tools/play-music.tool.test.ts` — assert explicit platform (e.g. `spotify`), default `youtube`, and normalized payload shape matching live tool
- [x] 2.2 Update any downstream test fixtures that mock `PLAY:MUSIC` payloads (e.g. `tests/services/message.service.test.ts`) to include `platform` when relevant
- [x] 2.3 Run `npm test -- tests/agent/tools/play-music.tool.test.ts` and confirm pass

## 3. Sync docs mirror

- [x] 3.1 Update `openspec/codebase/interfaces/agent-tools.md` to document `query` + `platform` on `PLAY:MUSIC`
