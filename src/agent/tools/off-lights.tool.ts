import { tool } from '@langchain/core/tools';
import type { WebSocket } from 'ws';
import { z } from 'zod';

import { requestFromClient } from '@/websocket/client-task-broker.js';

import { withToolPersistence } from './tool-persistence.js';
import type { ClientTaskPersistenceContext, ToolDefinition, ToolHandlerResult } from './types.js';

export const offLightsMetadata = {
  commandName: 'OFF:LIGHTS',
  phrases: ['turn off lights', 'lights off', 'switch off lights', 'kill the lights'],
  executor: 'client',
  payload: { target: 'lights', state: 'off' },
  clientTimeoutMs: 5_000,
  freshness: {
    refetchRequired: true,
    reason: 'is an action that must run each time it is requested',
  },
} as const;

export function buildOffLightsTool(
  ws: WebSocket,
  context?: ClientTaskPersistenceContext,
): ToolDefinition {
  const structuredTool = tool(
    async (): Promise<ToolHandlerResult> => {
      const execute = () =>
        requestFromClient(
          ws,
          offLightsMetadata.commandName,
          offLightsMetadata.payload,
          offLightsMetadata.clientTimeoutMs,
        );

      const clientResult = context
        ? await withToolPersistence(
            context,
            offLightsMetadata.commandName,
            offLightsMetadata.payload,
            offLightsMetadata.executor,
            execute,
          )
        : await execute();

      return {
        commandName: offLightsMetadata.commandName,
        executor: offLightsMetadata.executor,
        payload: { ...offLightsMetadata.payload, result: clientResult },
      };
    },
    {
      name: 'off_lights',
      description: `Use this when the user says: ${offLightsMetadata.phrases.join(', ')}.`,
      schema: z.object({}),
    },
  );

  return {
    tool: structuredTool,
    commandName: offLightsMetadata.commandName,
    executor: offLightsMetadata.executor,
  };
}
