/**
 * Adding a new tool:
 * 1. Create a new `*.tool.ts` file under `src/agent/tools/` following the same
 *    shape as `open-camera.tool.ts` (local metadata, phrase-anchored description,
 *    factory returning ToolDefinition).
 * 2. Export `*Metadata` and `build*Tool` from the tool file.
 * 3. Register metadata in `TOOL_METADATA` and add the factory to
 *    `CLIENT_TOOL_FACTORIES` or `SERVER_TOOL_FACTORIES`.
 *
 * Do not import individual tool files from outside this folder — use `index.ts`.
 */
import type { WebSocket } from 'ws';

import { buildOffLightsTool, offLightsMetadata } from './off-lights.tool.js';
import { buildOpenCameraTool, openCameraMetadata } from './open-camera.tool.js';
import { buildPlayMusicTool, playMusicMetadata } from './play-music.tool.js';
import { buildWebSearchTool, webSearchMetadata } from './web-search.tool.js';
import type {
  ClientTaskPersistenceContext,
  ClientToolFactory,
  ServerToolFactory,
  ToolDefinition,
  ToolMetadata,
} from './types.js';

const TOOL_METADATA: ToolMetadata[] = [
  {
    commandName: openCameraMetadata.commandName,
    executor: openCameraMetadata.executor,
    toolName: 'open_camera',
  },
  {
    commandName: offLightsMetadata.commandName,
    executor: offLightsMetadata.executor,
    toolName: 'off_lights',
  },
  {
    commandName: playMusicMetadata.commandName,
    executor: playMusicMetadata.executor,
    toolName: 'play_music',
  },
  {
    commandName: webSearchMetadata.commandName,
    executor: webSearchMetadata.executor,
    toolName: 'web_search',
  },
];

const CLIENT_TOOL_FACTORIES: ClientToolFactory[] = [
  buildOpenCameraTool,
  buildOffLightsTool,
  buildPlayMusicTool,
];

const SERVER_TOOL_FACTORIES: ServerToolFactory[] = [buildWebSearchTool];

export function assertUniqueToolDefinitions(definitions: ToolDefinition[]): void {
  const toolNames = new Set<string>();
  const commandNames = new Set<string>();

  for (const definition of definitions) {
    const { name } = definition.tool;

    if (toolNames.has(name)) {
      throw new Error(`Duplicate LangChain tool name: ${name}`);
    }
    toolNames.add(name);

    if (commandNames.has(definition.commandName)) {
      throw new Error(`Duplicate command name: ${definition.commandName}`);
    }
    commandNames.add(definition.commandName);
  }
}

export function assertUniqueToolMetadata(metadata: ToolMetadata[]): void {
  const toolNames = new Set<string>();
  const commandNames = new Set<string>();

  for (const entry of metadata) {
    if (toolNames.has(entry.toolName)) {
      throw new Error(`Duplicate LangChain tool name: ${entry.toolName}`);
    }
    toolNames.add(entry.toolName);

    if (commandNames.has(entry.commandName)) {
      throw new Error(`Duplicate command name: ${entry.commandName}`);
    }
    commandNames.add(entry.commandName);
  }
}

assertUniqueToolMetadata(TOOL_METADATA);

export function buildToolsForConnection(
  ws: WebSocket,
  context?: ClientTaskPersistenceContext,
): ToolDefinition[] {
  const clientTools = CLIENT_TOOL_FACTORIES.map((factory) => factory(ws, context));
  const serverTools = SERVER_TOOL_FACTORIES.map((factory) => factory(context));
  return [...clientTools, ...serverTools];
}

export function getToolByCommandName(commandName: string): ToolMetadata | undefined {
  return TOOL_METADATA.find((entry) => entry.commandName === commandName);
}

export function getToolMetadataByToolName(toolName: string): ToolMetadata | undefined {
  return TOOL_METADATA.find((entry) => entry.toolName === toolName);
}
