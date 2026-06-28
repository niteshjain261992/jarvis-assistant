## Context

`src/agent/tools/play-music.tool.ts` is a single-file LangChain tool that accepts `query` and `platform`, then delegates `{ query, platform }` to the mobile client via `requestFromClient`. The client is expected to figure out what to play. The user wants the server to resolve the exact music/video using platform-specific search APIs, build a deeplink, and send that URL to the client.

Existing patterns:
- Tool metadata and factory live in `*.tool.ts` files; registry imports from `play-music.tool.ts`.
- `normalizePlatform()` and `DEFAULT_MUSIC_PLATFORM` already exist.
- Env validation is centralized in `src/config/env.ts` (Zod); new API keys should be optional strings for now so dev/test does not require credentials until resolver runs.

## Goals / Non-Goals

**Goals:**

- Extract play-music logic into `src/agent/tools/play-music/` with `index.ts` as the public module entry (tool factory, metadata, platform normalization).
- Implement `resolvePlayMusicUrl(query, platform)` that returns a deeplink URL string (and optional resolved metadata).
- Implement YouTube resolver using YouTube Data API v3 search (`type=video`, `videoCategoryId=10`).
- Implement Spotify resolver using Spotify Web API search + track URI deeplink (`spotify:track:{id}`).
- Auto-select the first/best search result (top API result) for v1.
- Wire resolver into tool handler; client payload includes `url` plus original `query` and `platform`.
- Add env var placeholders for API credentials.
- Unit tests with mocked HTTP for resolvers and updated tool tests.

**Non-Goals:**

- LLM-based result ranking or user disambiguation ("did you mean…?").
- OAuth user login flows for Spotify (use client-credentials for search only).
- Full implementations for every platform alias (`apple_music`, `amazon_music`, `soundcloud`) in v1 — provide module stubs that throw a clear "unsupported platform" error or no-op placeholder files; YouTube and Spotify are fully implemented first.
- Changing LangChain tool name (`play_music`) or command name (`PLAY:MUSIC`).
- Requiring API keys at server startup.

## Decisions

### 1. Module layout under `src/agent/tools/play-music/`

```
play-music/
  index.ts              # playMusicMetadata, buildPlayMusicTool, normalizePlatform, re-exports
  resolver.ts             # resolvePlayMusicUrl(query, platform)
  types.ts              # ResolvedTrack, PlatformResolver, shared types
  youtube.platform.ts   # YouTube search + deeplink
  spotify.platform.ts   # Spotify search + deeplink
  apple-music.platform.ts   # stub (throws UnsupportedPlatformError)
  ...
```

`play-music.tool.ts` becomes a thin re-export from `./play-music/index.js` so existing registry imports and test paths keep working without churn.

**Alternative:** Delete `play-music.tool.ts` and update registry imports. Rejected to minimize import-path churn.

### 2. Resolver contract

```ts
interface ResolvedTrack {
  url: string;           // deeplink or https URL the client opens
  platform: string;
  title?: string;
  id?: string;             // videoId, trackId, etc.
}

resolvePlayMusicUrl(query: string, platform: string): Promise<ResolvedTrack>
```

- Normalizes platform via existing `normalizePlatform()`.
- Dispatches to a registry map: `{ youtube: resolveYoutube, spotify: resolveSpotify, ... }`.
- Unknown/unsupported platform → throw `Error` with message listing supported platforms (propagates to agent as tool failure).

### 3. YouTube implementation

- **Search:** `GET https://www.googleapis.com/youtube/v3/search?part=snippet&q={query}&type=video&videoCategoryId=10&maxResults=1&key={YOUTUBE_API_KEY}`
- **Auto-select:** First item in `items[]`.
- **Deeplink:** `https://www.youtube.com/watch?v={videoId}` (mobile clients handle https; optional `vnd.youtube:{videoId}` documented but https preferred for cross-platform).
- **Env:** `YOUTUBE_API_KEY` — optional in env schema; resolver throws if missing when YouTube is requested.

### 4. Spotify implementation

- **Auth:** Client credentials flow (`POST https://accounts.spotify.com/api/token`) using `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`.
- **Search:** `GET https://api.spotify.com/v1/search?q={query}&type=track&limit=1`
- **Auto-select:** First track in `tracks.items[]`.
- **Deeplink:** `spotify:track:{id}` (also include `https://open.spotify.com/track/{id}` as fallback in metadata if useful; primary `url` is spotify URI for native app open).
- **Env:** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — optional strings.

### 5. Client payload shape

Before resolver runs, handler builds:

```ts
const resolved = await resolvePlayMusicUrl(query, normalizedPlatform);
const payload = {
  query,
  platform: normalizedPlatform,
  url: resolved.url,
  title: resolved.title,
  id: resolved.id,
};
await requestFromClient(ws, 'PLAY:MUSIC', payload, ...);
```

Client still returns `result`; tool returns `{ ...payload, result: clientResult }`.

**Breaking for client:** Client must accept `url` and open it instead of searching locally. Document in codebase mirror.

### 6. HTTP and caching

- Use native `fetch` (Node 18+).
- No caching in v1 (queries are conversational and varied).
- Token cache for Spotify client-credentials in module-level variable with expiry check.

### 7. Environment variables

Add to `env.ts` as optional:

```ts
YOUTUBE_API_KEY: z.string().min(1).optional(),
SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
```

Resolvers validate presence at call time, not at boot.

## Risks / Trade-offs

- **[Risk] Wrong track auto-selected** → **Mitigation:** v1 accepts top result; tool description keeps Hindi/Bollywood query shaping; future work can add ranking.
- **[Risk] API quota / latency** → **Mitigation:** Keep existing `clientTimeoutMs` (30s); fail fast with clear error if API key missing or HTTP non-2xx.
- **[Risk] Spotify client-credentials may not cover all markets** → **Mitigation:** Document limitation; errors surface to user via agent.
- **[Risk] Stub platforms confuse users** → **Mitigation:** Throw explicit unsupported error; model can fall back to youtube in description guidance.
- **[Risk] Test brittleness from live API calls** → **Mitigation:** Mock `fetch` in unit tests; no integration tests against real APIs in CI.

## Migration Plan

1. Add `play-music/` module and resolver; keep `play-music.tool.ts` as re-export.
2. Update tool handler to resolve URL before `requestFromClient`.
3. Update mobile client to consume `url` (coordinated separately).
4. Add env vars to deployment config when keys are available.
5. Rollback: revert handler to pass `{ query, platform }` only if client not yet updated (temporary dual support not in v1 scope).

## Open Questions

- Should unsupported platforms automatically fall back to YouTube search, or fail explicitly? **Decision for v1:** fail explicitly so the agent can retry with youtube.
- Should `url` be https-only for all platforms for client uniformity? **Decision:** YouTube https; Spotify spotify URI (client already knows platform from payload).
