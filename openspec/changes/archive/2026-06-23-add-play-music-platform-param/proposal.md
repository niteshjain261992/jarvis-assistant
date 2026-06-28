## Why

The `play_music` tool already accepts a `query` for what to play, but users often specify where to play it ("play this on Spotify", "open it on YouTube"). Without a `platform` parameter, that intent is dropped and the client cannot route playback to the right service.

## What Changes

- Add a `platform` field to the `play_music` LangChain tool schema alongside `query`.
- Default `platform` to `youtube` when the user does not specify a service.
- Accept common platforms: `youtube`, `spotify`, `apple_music`, `amazon_music`, `soundcloud`, and allow other popular streaming service names in lowercase snake_case when the user names them.
- Include `platform` in the payload sent to `requestFromClient` and in the returned `ToolHandlerResult.payload`.
- Update tool description to instruct the model to infer platform from phrasing (e.g. "on Spotify" → `spotify`).
- Update unit tests and docs mirror for the new field.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `agent-tools`: `PLAY:MUSIC` tool schema and handler include `platform` with default `youtube`.

## Impact

- **Code**: `src/agent/tools/play-music.tool.ts`, `tests/agent/tools/play-music.tool.test.ts`, `tests/services/message.service.test.ts` (if fixtures assert payload shape)
- **Client contract**: `PLAY:MUSIC` action payloads gain a `platform` field (default `youtube` when omitted by the model)
- **Docs**: `openspec/codebase/interfaces/agent-tools.md`
