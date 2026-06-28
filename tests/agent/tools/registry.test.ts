import type { WebSocket } from 'ws';

import {
  assertUniqueToolDefinitions,
  assertUniqueToolMetadata,
  buildToolsForConnection,
  getToolByCommandName,
} from '@/agent/tools/index.js';
import { buildOffLightsTool } from '@/agent/tools/off-lights.tool.js';
import { buildOpenCameraTool } from '@/agent/tools/open-camera.tool.js';
import {
  assertUniqueToolDefinitions as assertFromRegistry,
  buildToolsForConnection as buildFromRegistry,
} from '@/agent/tools/registry.js';

const VALID_TOOL_NAME = /^[a-z][a-z0-9_]*$/;

function createMockWebSocket(): WebSocket {
  return { send: jest.fn() } as unknown as WebSocket;
}

describe('agent tools registry', () => {
  it('buildToolsForConnection returns exactly four tool definitions', () => {
    const tools = buildToolsForConnection(createMockWebSocket());
    expect(tools).toHaveLength(4);
    expect(tools.map((t) => t.commandName).sort()).toEqual([
      'OFF:LIGHTS',
      'OPEN:CAMERA',
      'PLAY:MUSIC',
      'WEB:SEARCH',
    ]);
  });

  it('each tool name has no colons and is a valid identifier', () => {
    for (const definition of buildToolsForConnection(createMockWebSocket())) {
      expect(definition.tool.name).not.toContain(':');
      expect(definition.tool.name).toMatch(VALID_TOOL_NAME);
    }
  });

  it('getToolByCommandName resolves each command name to metadata', () => {
    expect(getToolByCommandName('OPEN:CAMERA')).toEqual({
      commandName: 'OPEN:CAMERA',
      executor: 'client',
      toolName: 'open_camera',
    });
    expect(getToolByCommandName('OFF:LIGHTS')).toEqual({
      commandName: 'OFF:LIGHTS',
      executor: 'client',
      toolName: 'off_lights',
    });
    expect(getToolByCommandName('PLAY:MUSIC')).toEqual({
      commandName: 'PLAY:MUSIC',
      executor: 'client',
      toolName: 'play_music',
    });
    expect(getToolByCommandName('WEB:SEARCH')).toEqual({
      commandName: 'WEB:SEARCH',
      executor: 'server',
      toolName: 'web_search',
    });
  });

  it('getToolByCommandName returns undefined for an unknown command name', () => {
    expect(getToolByCommandName('UNKNOWN:NONE')).toBeUndefined();
  });

  it('assertUniqueToolDefinitions throws on duplicate LangChain tool name', () => {
    const ws = createMockWebSocket();
    expect(() =>
      assertUniqueToolDefinitions([
        buildOpenCameraTool(ws),
        {
          ...buildOffLightsTool(ws),
          tool: buildOpenCameraTool(ws).tool,
        },
      ]),
    ).toThrow(/Duplicate LangChain tool name: open_camera/);
  });

  it('assertUniqueToolDefinitions throws on duplicate command name', () => {
    const ws = createMockWebSocket();
    expect(() =>
      assertUniqueToolDefinitions([
        buildOpenCameraTool(ws),
        {
          ...buildOffLightsTool(ws),
          commandName: buildOpenCameraTool(ws).commandName,
        },
      ]),
    ).toThrow(/Duplicate command name: OPEN:CAMERA/);
  });

  it('assertUniqueToolMetadata throws on duplicate LangChain tool name', () => {
    expect(() =>
      assertUniqueToolMetadata([
        { commandName: 'OPEN:CAMERA', executor: 'client', toolName: 'open_camera' },
        { commandName: 'OFF:LIGHTS', executor: 'client', toolName: 'open_camera' },
      ]),
    ).toThrow(/Duplicate LangChain tool name: open_camera/);
  });

  it('assertUniqueToolMetadata throws on duplicate command name', () => {
    expect(() =>
      assertUniqueToolMetadata([
        { commandName: 'OPEN:CAMERA', executor: 'client', toolName: 'open_camera' },
        { commandName: 'OPEN:CAMERA', executor: 'client', toolName: 'off_lights' },
      ]),
    ).toThrow(/Duplicate command name: OPEN:CAMERA/);
  });
});

describe('agent tools index public API', () => {
  it('re-exports registry helpers', () => {
    const ws = createMockWebSocket();
    const fromIndex = buildToolsForConnection(ws);
    const fromRegistry = buildFromRegistry(ws);
    expect(fromIndex.map((tool) => tool.commandName)).toEqual(
      fromRegistry.map((tool) => tool.commandName),
    );
    expect(fromIndex.map((tool) => tool.tool.name)).toEqual(
      fromRegistry.map((tool) => tool.tool.name),
    );
    expect(getToolByCommandName('OPEN:CAMERA')?.toolName).toBe('open_camera');
    expect(assertUniqueToolDefinitions).toBe(assertFromRegistry);
  });
});
