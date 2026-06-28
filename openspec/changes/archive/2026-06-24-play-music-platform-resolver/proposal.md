## Why

The `play_music` tool currently forwards a raw `query` and `platform` to the mobile client, leaving search and deeplink construction on the device. The server should resolve the exact track or video via platform APIs and send a ready-to-open deeplink so the client can start playback immediately and consistently.

## What Changes

- Refactor `play-music.tool.ts` into a `play-music/` module with `index.ts` holding the LangChain tool factory and metadata.
- Add platform-specific resolver modules (e.g. `youtube.platform.ts`, `spotify.platform.ts`) that search via each service's API, auto-select the top result, and build a platform deeplink URL.
- Add a shared `resolvePlayMusicUrl(query, platform)` function that routes to the correct platform resolver.
- Update the tool handler to call the resolver server-side and send `{ query, platform, url }` (plus resolved metadata such as title/id when available) to the mobile client via `requestFromClient`.
- Add environment variables for platform API keys (e.g. `YOUTUBE_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`) — values wired later; schema placeholders only for now.
- Update unit tests for resolver logic, platform routing, and updated client payload shape.
- Update docs mirror for the new module layout and payload contract.

## Capabilities

### New Capabilities

- `play-music-resolver`: Server-side music/video search and deeplink resolution per streaming platform before delegating to the client.

### Modified Capabilities

- `agent-tools`: `PLAY:MUSIC` tool handler resolves a platform deeplink on the server and includes `url` (and resolved track metadata) in the client payload instead of delegating raw search to the client.

## Impact

- **Code**: `src/agent/tools/play-music/` (new), `src/agent/tools/play-music.tool.ts` (thin re-export or removal), `src/config/env.ts`, `tests/agent/tools/play-music*.test.ts`, `tests/services/message.service.test.ts` (if payload fixtures change)
- **Client contract**: `PLAY:MUSIC` action payloads gain `url` (deeplink) and optional resolved fields (`title`, `videoId`/`trackId`); client may no longer need to search by query
- **Dependencies**: Outbound HTTP to YouTube Data API v3 and Spotify Web API (and stubs for other platforms)
- **Secrets**: New env vars for platform API credentials (not required at startup until resolver is invoked)
