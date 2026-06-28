## Context

`buildPlayMusicTool` accepts a required `query` and delegates `{ query }` (plus client `result`) to the client. Users frequently name a streaming service in the same utterance. The agent needs a structured `platform` field so the client can open YouTube, Spotify, or another service without guessing from free text.

## Goals / Non-Goals

**Goals:**

- Add `platform` to the tool Zod schema with default `youtube`.
- Document accepted values: `youtube`, `spotify`, `apple_music`, `amazon_music`, `soundcloud`, plus other popular platforms as lowercase snake_case strings.
- Pass `platform` through to `requestFromClient` payload and handler result.
- Normalize model output in the handler when possible (lowercase, spaces → underscores).

**Non-Goals:**

- Client-side playback implementation for each platform.
- Validating platform against a live registry of installed apps.
- Changing other tools or command catalog entries.

## Decisions

### 1. Schema shape

**Decision:**

```ts
const DEFAULT_MUSIC_PLATFORM = 'youtube';

const platformSchema = z
  .string()
  .min(1)
  .default(DEFAULT_MUSIC_PLATFORM)
  .describe(
    'Streaming platform in lowercase snake_case. Default youtube. ' +
      'Common values: youtube, spotify, apple_music, amazon_music, soundcloud. ' +
      'Use other popular service names when the user specifies them.',
  );

z.object({
  query: z.string().min(1).describe(/* existing query describe */),
  platform: platformSchema,
});
```

**Rationale:** A string with default keeps flexibility for "other popular platforms" while guiding the model toward known values. Strict enum-only would reject valid user requests like "play on gaana".

**Alternative considered:** `z.enum(['youtube', 'spotify', ...]).default('youtube')`. Rejected — too rigid for regional/other services.

### 2. Normalization

**Decision:** In the handler, normalize platform before building payload:

```ts
function normalizePlatform(platform: string): string {
  return platform.trim().toLowerCase().replace(/\s+/g, '_');
}
```

Map common aliases if needed: `you tube` → `youtube`, `yt` → `youtube`.

**Rationale:** Reduces client branching on variant spellings from the LLM.

### 3. Payload shape

**Decision:** Runtime payload `{ query, platform }` (preserve current shape without reintroducing `action` unless tests require it — align handler and tests in implementation).

**Rationale:** Minimal delta on top of current tool file; client receives both routing fields.

### 4. Description update

**Decision:** Extend tool description: "Infer platform from phrases like 'on Spotify' or 'YouTube pe bajao'; default to youtube when unspecified."

## Risks / Trade-offs

- **[Risk] Model omits platform** → **Mitigation:** Zod `.default('youtube')` ensures handler always receives a value.
- **[Risk] Unknown platform strings** → **Mitigation:** Client handles gracefully; backend passes through normalized string.
- **[Risk] Test drift with current `{ action: 'music' }` expectations** → **Mitigation:** Tasks include reconciling tests with live `play-music.tool.ts` payload shape.
