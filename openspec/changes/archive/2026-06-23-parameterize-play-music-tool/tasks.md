## 1. Update play music tool

- [x] 1.1 Change `playMusicMetadata.payload` to `{ action: 'music' }` in `src/agent/tools/play-music.tool.ts`
- [x] 1.2 Add required `query` string to the LangChain tool schema with a descriptive `.describe()` and `.min(1)`
- [x] 1.3 Update handler to accept `{ query }`, build `{ action: 'music', query }` for `requestFromClient`, and include `query` in returned `ToolHandlerResult.payload`
- [x] 1.4 Update tool description to instruct the model to extract the music query from the user message

## 2. Align command catalog

- [x] 2.1 Update `PLAY:MUSIC` entry in `src/config/command-catalog.ts` to `payload: { action: 'music' }`

## 3. Update tests

- [x] 3.1 Update `tests/agent/tools/play-music.tool.test.ts` — invoke with `{ query: '...' }`, assert payload includes `action: 'music'` and `query`
- [x] 3.2 Update `tests/config/command-catalog.test.ts` for new `PLAY:MUSIC` payload
- [x] 3.3 Update any other tests/fixtures using `{ action: 'play_music' }` (e.g. `tests/services/message.service.test.ts`)
- [x] 3.4 Run `npm test -- tests/agent/tools/play-music.tool.test.ts tests/config/command-catalog.test.ts` and confirm pass

## 4. Sync docs mirror (optional)

- [x] 4.1 Update `openspec/codebase/interfaces/agent-tools.md` if it documents the static `play_music` payload shape
