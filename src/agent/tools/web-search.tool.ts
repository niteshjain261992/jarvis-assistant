import { tool } from '@langchain/core/tools';
import { tavily } from '@tavily/core';
import type { TavilySearchResponse } from '@tavily/core';
import { z } from 'zod';

import { env } from '@/config/env.js';
import { throwServerError } from '@/errors/index.js';

import { withToolPersistence } from './tool-persistence.js';
import type { ClientTaskPersistenceContext, ToolDefinition } from './types.js';

export const webSearchMetadata = {
  commandName: 'WEB:SEARCH',
  phrases: [
    'search the web',
    'look up online',
    'google this',
    'what is the weather',
    'latest news',
    'current score',
  ],
  executor: 'server',
  payload: {},
  freshness: {
    refetchRequired: true,
    reason: 'returns real-time information that changes over time',
  },
} as const;

function formatTavilyResponse(response: TavilySearchResponse): string {
  const sources = response.results.map((result) => `${result.title}\n${result.content}`).join('\n\n');

  if (response.answer) {
    return `Direct answer: ${response.answer}\n\nSources:\n${sources}`;
  }

  return sources;
}

export function buildWebSearchTool(context?: ClientTaskPersistenceContext): ToolDefinition {
  const tavilyClient = tavily({ apiKey: env.TAVILY_API_KEY });

  const structuredTool = tool(
    async ({ query }): Promise<string> => {
      const execute = async (): Promise<string> => {
        try {
          const response = await tavilyClient.search(query, {
            maxResults: 3,
            searchDepth: 'basic',
            includeAnswer: true,
          });
          return formatTavilyResponse(response);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          throwServerError(`Tavily search failed: ${message}`);
        }
      };

      return context
        ? await withToolPersistence(
            context,
            webSearchMetadata.commandName,
            { query },
            'server',
            execute,
          )
        : await execute();
    },
    {
      name: 'web_search',
      description:
        `Use this when the user says: ${webSearchMetadata.phrases.join(', ')}. ` +
        'Search the web for current real-world information such as weather, news, scores, and prices. ' +
        'Do NOT use this tool for general knowledge, conversation history, or date/time questions — ' +
        'those are answered from the system prompt.',
      schema: z.object({
        query: z.string().min(1).describe('The web search query'),
      }),
    },
  );

  return {
    tool: structuredTool,
    commandName: webSearchMetadata.commandName,
    executor: webSearchMetadata.executor,
  };
}
