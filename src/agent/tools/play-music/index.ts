import { tool } from '@langchain/core/tools';
import type { WebSocket } from 'ws';
import { z } from 'zod';

import { handleJarvisError } from '@/errors/index.js';
import { requestFromClient } from '@/websocket/client-task-broker.js';

import { withToolPersistence } from '../tool-persistence.js';
import type { ClientTaskPersistenceContext, ToolDefinition, ToolHandlerResult } from '../types.js';
import { DEFAULT_MUSIC_PLATFORM, normalizePlatform } from './platform.js';
import { resolvePlayMusicUrl } from './resolver.js';

export { DEFAULT_MUSIC_PLATFORM, normalizePlatform } from './platform.js';
export { resolvePlayMusicUrl } from './resolver.js';
export type { PlatformResolver, ResolvedTrack } from './types.js';

export const playMusicMetadata = {
  commandName: 'PLAY:MUSIC',
  phrases: ['play music', 'start music', 'play some songs', 'put on music'],
  executor: 'client',
  payload: {},
  clientTimeoutMs: 10_000,
} as const;

export function buildPlayMusicTool(
  ws: WebSocket,
  context?: ClientTaskPersistenceContext,
): ToolDefinition {
  const structuredTool = tool(
    async ({ query, platform }): Promise<ToolHandlerResult> => {
      const normalizedPlatform = normalizePlatform(platform);
      const resolved = await resolvePlayMusicUrl(query, normalizedPlatform);
      const payload = {
        query,
        platform: normalizedPlatform,
        url: resolved.url,
        title: resolved.title,
        id: resolved.id,
      };
      const execute = () =>
        requestFromClient(
          ws,
          playMusicMetadata.commandName,
          payload,
          playMusicMetadata.clientTimeoutMs,
        );

      let clientResult: unknown;
      try {
        clientResult = context
          ? await withToolPersistence(
              context,
              playMusicMetadata.commandName,
              payload,
              'client',
              execute,
            )
          : await execute();
      } catch (err) {
        clientResult = handleJarvisError(err, {
          mode: 'tool',
          onClientTimeout: (error) => ({
            status: 'client_timeout',
            type: error.type,
            message: error.message,
          }),
        });
      }

      return {
        commandName: playMusicMetadata.commandName,
        executor: playMusicMetadata.executor,
        payload: { ...payload, result: clientResult },
      };
    },
    {
      name: 'play_music',
      description:
        `Use this when the user says: ${playMusicMetadata.phrases.join(', ')}. ` +
        'Extract what music to play from the user message and pass it as query. ' +
        'Infer platform from phrasing such as "on Spotify" or "YouTube pe bajao"; default to youtube when unspecified.',
      schema: z.object({
        query: z
          .string()
          .min(1)
          .describe(
            'The music query adapted for a Hindi/Bollywood audience. ' +
              'Convert moods, genres, or occasions into Hindi music equivalents. ' +
              'Examples: "jazz" → "smooth Bollywood instrumental", ' +
              '"party" → "Bollywood party songs", ' +
              '"sad" → "dard bhare gaane", ' +
              '"romantic evening" → "Hindi romantic songs"',
          ),
        platform: z
          .string()
          .min(1)
          .default(DEFAULT_MUSIC_PLATFORM)
          .describe(
            'Streaming platform in lowercase snake_case. Default youtube. ' +
              'Common values: youtube, spotify, apple_music, amazon_music, soundcloud. ' +
              'Use other popular service names when the user specifies them.',
          ),
      }),
    },
  );

  return {
    tool: structuredTool,
    commandName: playMusicMetadata.commandName,
    executor: playMusicMetadata.executor,
  };
}
