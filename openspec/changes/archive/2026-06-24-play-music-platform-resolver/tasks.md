## 1. Module structure

- [x] 1.1 Create `src/agent/tools/play-music/` folder with `types.ts` defining `ResolvedTrack` and `PlatformResolver` types
- [x] 1.2 Move tool factory, metadata, `normalizePlatform`, and `DEFAULT_MUSIC_PLATFORM` from `play-music.tool.ts` into `play-music/index.ts`
- [x] 1.3 Replace `play-music.tool.ts` body with re-exports from `./play-music/index.js` so registry and existing imports keep working

## 2. Environment variables

- [x] 2.1 Add optional `YOUTUBE_API_KEY`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` to `src/config/env.ts` Zod schema
- [x] 2.2 Document new env vars in `.env.example` (if present) or codebase mirror only

## 3. Platform resolvers

- [x] 3.1 Create `play-music/youtube.platform.ts` — search via YouTube Data API v3 (`part=snippet`, `type=video`, `videoCategoryId=10`, `maxResults=1`), auto-select first result, return `https://www.youtube.com/watch?v={videoId}` with `title` and `id`
- [x] 3.2 Create `play-music/spotify.platform.ts` — client-credentials token fetch, search tracks (`limit=1`), auto-select first result, return `spotify:track:{id}` with `title` and `id`; cache token until expiry
- [x] 3.3 Create stub platform files for `apple-music`, `amazon-music`, and `soundcloud` that throw a clear unsupported-platform error (or export no-op placeholders registered but not fully implemented)
- [x] 3.4 Create `play-music/resolver.ts` with `resolvePlayMusicUrl(query, platform)` — normalize platform, dispatch to resolver map, throw on unknown platform or missing API key

## 4. Wire resolver into tool handler

- [x] 4.1 Update `buildPlayMusicTool` handler in `play-music/index.ts` to call `resolvePlayMusicUrl` before `requestFromClient`
- [x] 4.2 Send client payload `{ query, platform, url, title?, id? }` via `requestFromClient` and include resolved fields plus `result` in returned `ToolHandlerResult.payload`

## 5. Tests

- [x] 5.1 Add `tests/agent/tools/play-music/resolver.test.ts` — mock `fetch` for YouTube and Spotify success, empty results, missing API key, unsupported platform
- [x] 5.2 Add `tests/agent/tools/play-music/youtube.platform.test.ts` — assert search URL shape and deeplink output
- [x] 5.3 Add `tests/agent/tools/play-music/spotify.platform.test.ts` — assert token + search flow and deeplink output
- [x] 5.4 Update `tests/agent/tools/play-music.tool.test.ts` — mock `resolvePlayMusicUrl`, assert client payload includes `url` and resolved metadata
- [x] 5.5 Update `tests/services/message.service.test.ts` fixtures if they assert `PLAY:MUSIC` payload shape
- [x] 5.6 Run `npm test -- tests/agent/tools/play-music` and confirm pass

## 6. Documentation

- [x] 6.1 Update `openspec/codebase/interfaces/agent-tools.md` — document `play-music/` module layout, resolver, and new client payload fields (`url`, `title`, `id`)
