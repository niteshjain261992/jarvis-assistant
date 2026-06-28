import type { StructuredTool } from '@langchain/core/tools';
import type { WebSocket } from 'ws';

import type { CommandExecutor } from '@/config/command-catalog.js';

import type { ClientTaskPersistenceContext } from './tool-persistence.js';

export type { ClientTaskPersistenceContext };

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

export type ClientToolFactory = (
  ws: WebSocket,
  context?: ClientTaskPersistenceContext,
) => ToolDefinition;

export type ServerToolFactory = (
  context?: ClientTaskPersistenceContext,
) => ToolDefinition;
