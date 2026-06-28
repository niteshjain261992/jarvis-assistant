## Context

`buildPlayMusicTool` in `play-music.tool.ts` defines a zero-argument LangChain tool (`z.object({})`) that delegates to the client with a fixed payload `{ action: 'play_music' }`. Other tools (camera, lights) also use static payloads, but music requests are inherently open-ended — the agent should capture what the user asked for.

The tool file owns local metadata (`playMusicMetadata`); `COMMAND_CATALOG` mirrors the base payload for lookup consistency.

## Goals / Non-Goals

**Goals:**

- Accept a `query` string in the tool schema describing which music to play.
- Send `{ action: 'music', query }` to `requestFromClient` and in the returned `ToolHandlerResult.payload`.
- Rename base action from `play_music` to `music`.
- Keep tool name `play_music`, command name `PLAY:MUSIC`, and existing phrases unchanged.

**Non-Goals:**

- Changing other tools (camera, lights).
- Adding catalog-driven prompt generation for music.
- Client-side playback implementation.

## Decisions

### 1. Schema shape

**Decision:** Use a single required string field:

```ts
z.object({
  query: z
    .string()
    .describe(
      'The music query adapted for a Hindi/Bollywood audience. ' +
        'Convert moods, genres, or occasions into Hindi music equivalents. ' +
        'Examples: "jazz" → "smooth Bollywood instrumental", ' +
        '"party" → "Bollywood party songs", ' +
        '"sad" → "dard bhare gaane", ' +
        '"romantic evening" → "Hindi romantic songs"',
    ),
});
```

**Rationale:** LangChain tools work best with explicit required fields; the model must always supply a value. When the user is vague ("play music"), the model should infer a reasonable query (e.g. `"music"` or `"some music"`).

**Alternative considered:** Optional `query` with handler default. Rejected — explicit required field forces the model to think about intent.

### 2. Payload construction

**Decision:**

- Static metadata base: `payload: { action: 'music' }`
- Runtime payload: `{ action: 'music', query }` passed to `requestFromClient` and merged into handler result with `result`.

```ts
const payload = { ...playMusicMetadata.payload, query };
```

**Rationale:** Separates fixed action discriminator from user-specific query. Aligns with user requirement to use `music` not `play_music`.

### 3. Catalog alignment

**Decision:** Update `COMMAND_CATALOG` entry for `PLAY:MUSIC` to `payload: { action: 'music' }` (no `query` in catalog — query is runtime-only from the tool argument).

**Rationale:** Catalog holds base metadata; dynamic fields belong in the tool handler.

### 4. Description update

**Decision:** Extend tool description to mention extracting the music query, e.g. "Extract what music the user wants and pass it as `query`."

**Rationale:** Helps the ReAct agent populate the new parameter correctly.

## Risks / Trade-offs

- **[Risk] Client expects `action: 'play_music'`** → **Mitigation:** Document as **BREAKING** client contract change; update any client handlers for `PLAY:MUSIC`.
- **[Risk] Model passes empty query** → **Mitigation:** Tests cover handler with explicit query; zod rejects empty string if we add `.min(1)` — recommend `.min(1)` in implementation.
- **[Risk] Test/fixture drift** → **Mitigation:** Update `play-music.tool.test.ts`, `command-catalog.test.ts`, and message service tests referencing old payload.
