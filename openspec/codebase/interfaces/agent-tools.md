# Interface: agent-tools (`src/agent/tools/`)

## Public barrel (`src/agent/tools/index.ts`)

```ts
export {
  assertUniqueToolDefinitions,
  assertUniqueToolMetadata,
  buildToolsForConnection,
  getToolByCommandName,
  getToolMetadataByToolName,
} from './registry.js';

export type {
  ClientTaskPersistenceContext,
  ClientToolFactory,
  ToolDefinition,
  ToolHandlerResult,
  ToolMetadata,
} from './types.js';
```

- **Only public import path** for agent tools outside this folder (except tests under `tests/agent/tools/`).

## Types (`src/agent/tools/types.ts`)

```ts
export type ClientToolFactory = (ws: WebSocket, context?: ClientTaskPersistenceContext) => ToolDefinition;

export interface ToolHandlerResult {
  commandName: string;
  executor: CommandExecutor;
  payload: Record<string, unknown>;
}

export interface ToolDefinition {
  tool: StructuredTool;
  commandName: string;
  executor: CommandExecutor;
}

export interface ToolMetadata {
  commandName: string;
  executor: CommandExecutor;
  toolName: string;
}
```

- `ClientTaskPersistenceContext` is defined in `client-task-broker.ts` and re-exported here.

## Registry (`src/agent/tools/registry.ts`)

```ts
export function buildToolsForConnection(ws: WebSocket, context?: ClientTaskPersistenceContext): ToolDefinition[];
export function getToolByCommandName(commandName: string): ToolMetadata | undefined;
export function getToolMetadataByToolName(toolName: string): ToolMetadata | undefined;
export function assertUniqueToolDefinitions(definitions: ToolDefinition[]): void;
export function assertUniqueToolMetadata(metadata: ToolMetadata[]): void;
```

- `TOOL_METADATA` and `CLIENT_TOOL_FACTORIES` registered at module load; duplicate tool/command names throw.
- Three client tools: `open_camera` (`OPEN:CAMERA`), `off_lights` (`OFF:LIGHTS`), `play_music` (`PLAY:MUSIC`).

## Per-tool files (`*.tool.ts`)

Each tool file exports:

- `*Metadata` — local `commandName`, `phrases`, `executor`, `payload` (not loaded from `COMMAND_CATALOG`)
- `build*Tool(ws, context?)` — factory returning `ToolDefinition` that awaits `requestFromClient` for client executors

Example: `open-camera.tool.ts` → `openCameraMetadata`, `buildOpenCameraTool`.

`play-music.tool.ts` re-exports from the `play-music/` module. The tool accepts required `query` and optional `platform` (default `youtube`), resolves a platform deeplink server-side via `resolvePlayMusicUrl`, then delegates `{ query, platform, url, title?, id? }` to the client.

## Play music module (`src/agent/tools/play-music/`)

```
play-music/
  index.ts              # playMusicMetadata, buildPlayMusicTool, re-exports
  platform.ts           # normalizePlatform, DEFAULT_MUSIC_PLATFORM
  resolver.ts           # resolvePlayMusicUrl(query, platform)
  types.ts              # ResolvedTrack, PlatformResolver
  youtube.platform.ts   # YouTube Data API v3 search → watch URL
  spotify.platform.ts   # Spotify Web API search → spotify:track:{id}
  *.platform.ts         # stubs for apple_music, amazon_music, soundcloud
```

- **Env vars** (optional at startup): `YOUTUBE_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- **Client payload**: `{ query, platform, url, title?, id? }` after server-side resolution
- **Client timeout**: uses `handleJarvisError` from `src/errors/`; on `CLIENT_TIMEOUT` returns success with resolved URL and `result: { status: 'client_timeout', type: 'CLIENT_TIMEOUT', message }`. Resolver `SERVER_ERROR` and client `CLIENT_ERROR` still propagate.

## Adding a tool

1. Create `src/agent/tools/<name>.tool.ts` following `open-camera.tool.ts`
2. Register metadata in `TOOL_METADATA` and factory in `CLIENT_TOOL_FACTORIES`
3. Do not import individual tool files from outside this folder

## Related

- See `interfaces/domain-errors.md` for typed errors and `handleJarvisError`.
- See `interfaces/client-task-broker.md` for `requestFromClient`.
- See `interfaces/agent-runner.md` for agent binding.
