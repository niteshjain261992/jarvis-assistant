## Why

The `play_music` tool currently takes no arguments and always sends a static `{ action: 'play_music' }` payload to the client. Users often ask for specific songs or artists ("play Bohemian Rhapsody", "put on some jazz"), but that intent is lost because the tool cannot accept a music query. Parameterizing the tool lets the agent pass the user's request through to the client action payload.

## What Changes

- Add a `query` string parameter to the `play_music` LangChain tool schema (what music the user wants to play).
- Build the client payload as `{ action: 'music', query: <query> }` instead of the static `{ action: 'play_music' }`.
- Change the base `action` value from `play_music` to `music` in `playMusicMetadata.payload` and align `COMMAND_CATALOG` for `PLAY:MUSIC`.
- Update tool description to instruct the model to extract the music query from the user's message.
- Update unit tests and any fixtures that assert the old payload shape.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `agent-tools`: `PLAY:MUSIC` tool accepts a `query` argument and includes it in the delegated client payload with `action: 'music'`.
- `command-catalog`: `PLAY:MUSIC` catalog entry base payload uses `action: 'music'` instead of `action: 'play_music'`.

## Impact

- **Code**: `src/agent/tools/play-music.tool.ts`, `src/config/command-catalog.ts`, `tests/agent/tools/play-music.tool.test.ts`, `tests/config/command-catalog.test.ts`, `tests/services/message.service.test.ts` (if fixtures use old payload)
- **Client contract**: WebSocket action payloads for `PLAY:MUSIC` change shape — clients must read `query` and `action: 'music'` instead of `action: 'play_music'`
- **API**: `AgentRunResult.actionPayload` for music actions will include `query`
