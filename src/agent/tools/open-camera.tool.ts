import { tool } from '@langchain/core/tools';
import type { WebSocket } from 'ws';
import { z } from 'zod';

import { requestFromClient } from '@/websocket/client-task-broker.js';

import { withToolPersistence } from './tool-persistence.js';
import type { ClientTaskPersistenceContext, ToolDefinition, ToolHandlerResult } from './types.js';

export const openCameraMetadata = {
  commandName: 'OPEN:CAMERA',
  phrases: [
    'open camera',
    'show camera',
    'turn on camera',
    'start camera',
    'take a photo',
    'take a picture',
  ],
  executor: 'client',
  payload: { target: 'camera' },
  clientTimeoutMs: 30_000,
} as const;

export function buildOpenCameraTool(
  ws: WebSocket,
  context?: ClientTaskPersistenceContext,
): ToolDefinition {
  const structuredTool = tool(
    async (): Promise<ToolHandlerResult> => {
      const execute = () =>
        requestFromClient(
          ws,
          openCameraMetadata.commandName,
          openCameraMetadata.payload,
          openCameraMetadata.clientTimeoutMs,
        );

      const clientResult = context
        ? await withToolPersistence(
            context,
            openCameraMetadata.commandName,
            openCameraMetadata.payload,
            openCameraMetadata.executor,
            execute,
          )
        : await execute();

      return {
        commandName: openCameraMetadata.commandName,
        executor: openCameraMetadata.executor,
        payload: { ...openCameraMetadata.payload, result: clientResult },
      };
    },
    {
      name: 'open_camera',
      description: `Use this when the user says: ${openCameraMetadata.phrases.join(', ')}.`,
      schema: z.object({}),
    },
  );

  return {
    tool: structuredTool,
    commandName: openCameraMetadata.commandName,
    executor: openCameraMetadata.executor,
  };
}
