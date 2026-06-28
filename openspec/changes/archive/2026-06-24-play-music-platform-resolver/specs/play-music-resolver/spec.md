## ADDED Requirements

### Requirement: Platform music resolver module

The system SHALL provide a `play-music` module under `src/agent/tools/play-music/` with a public `resolvePlayMusicUrl(query, platform)` function that searches the requested streaming platform, auto-selects the top search result, builds a platform deeplink URL, and returns resolved metadata. Platform-specific search logic SHALL live in separate files (e.g. `youtube.platform.ts`, `spotify.platform.ts`). The module SHALL export `normalizePlatform`, `DEFAULT_MUSIC_PLATFORM`, `playMusicMetadata`, and `buildPlayMusicTool` from `index.ts`.

#### Scenario: YouTube resolver returns watch URL for top result

- **WHEN** `resolvePlayMusicUrl('Bollywood party songs', 'youtube')` is called and the YouTube Data API returns at least one video in `items`
- **THEN** the function returns an object whose `url` is `https://www.youtube.com/watch?v={videoId}` for the first result
- **AND** `platform` is `youtube`
- **AND** `title` and `id` reflect the selected video

#### Scenario: Spotify resolver returns track deeplink for top result

- **WHEN** `resolvePlayMusicUrl('romantic hindi songs', 'spotify')` is called and the Spotify Web API returns at least one track
- **THEN** the function returns an object whose `url` is `spotify:track:{trackId}` for the first result
- **AND** `platform` is `spotify`

#### Scenario: Unsupported platform throws

- **WHEN** `resolvePlayMusicUrl('any query', 'gaana')` is called and no resolver is implemented for that platform
- **THEN** the function throws an error indicating the platform is not supported

#### Scenario: Missing API key throws when platform is invoked

- **WHEN** `resolvePlayMusicUrl('query', 'youtube')` is called and `YOUTUBE_API_KEY` is not configured
- **THEN** the function throws an error indicating the YouTube API key is missing

### Requirement: YouTube search uses Data API v3

The YouTube platform resolver SHALL call `https://www.googleapis.com/youtube/v3/search` with query parameters `part=snippet`, `q={encoded query}`, `type=video`, `videoCategoryId=10`, `maxResults=1`, and `key={YOUTUBE_API_KEY}`.

#### Scenario: Search request shape

- **WHEN** the YouTube resolver runs for query `test song`
- **THEN** it performs an HTTP GET whose URL includes `type=video`, `videoCategoryId=10`, and `q=test%20song`

### Requirement: Platform API credentials via environment

The system SHALL read platform API credentials from environment variables. At minimum: `YOUTUBE_API_KEY` for YouTube, `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for Spotify. These variables SHALL be optional in the central env schema so the server can start without them; resolvers SHALL validate credentials when invoked.

#### Scenario: Env schema allows missing keys at startup

- **WHEN** the server starts without `YOUTUBE_API_KEY` set
- **THEN** startup succeeds
- **AND** invoking the YouTube resolver at runtime fails with a clear missing-key error
