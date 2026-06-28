jest.mock('@/repositories/message.repository.js', () => ({
  insertMessage: jest.fn().mockResolvedValue(undefined),
  updateMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const searchMock = jest.fn();

jest.mock('@tavily/core', () => ({
  tavily: jest.fn(() => ({ search: searchMock })),
}));

jest.mock('@/config/env.js', () => ({
  env: { TAVILY_API_KEY: 'test-key' },
}));

jest.mock('@/websocket/client-task-broker.js', () => ({
  requestFromClient: jest.fn(),
}));

import { JarvisErrorType } from '@/errors/index.js';
import * as errors from '@/errors/index.js';
import {
  buildWebSearchTool,
  webSearchMetadata,
} from '@/agent/tools/web-search.tool.js';
import * as messageRepository from '@/repositories/message.repository.js';
import { requestFromClient } from '@/websocket/client-task-broker.js';

const insertMessageMock = messageRepository.insertMessage as jest.MockedFunction<
  typeof messageRepository.insertMessage
>;
const updateMessageMock = messageRepository.updateMessage as jest.MockedFunction<
  typeof messageRepository.updateMessage
>;
const requestFromClientMock = requestFromClient as jest.MockedFunction<typeof requestFromClient>;

const persistenceContext = {
  conversationId: 'conv-1',
  userMessageId: 'user-1',
  actionSequenceNumber: 3,
};

describe('buildWebSearchTool', () => {
  beforeEach(() => {
    searchMock.mockReset();
    insertMessageMock.mockClear();
    updateMessageMock.mockClear();
    requestFromClientMock.mockReset();
  });

  it('returns expected tool definition shape', () => {
    const definition = buildWebSearchTool();

    expect(definition.commandName).toBe('WEB:SEARCH');
    expect(definition.executor).toBe('server');
    expect(definition.tool.name).toBe('web_search');
  });

  it('returns Direct answer prefix when Tavily answer is present', async () => {
    searchMock.mockResolvedValue({
      answer: 'Sunny, 32°C',
      results: [{ title: 'Weather Delhi', content: 'Clear skies in Delhi.' }],
    });
    const tool = buildWebSearchTool();

    const result = await tool.tool.invoke({ query: 'weather in Delhi' });

    expect(result).toMatch(/^Direct answer: Sunny, 32°C/);
    expect(result).toContain('Weather Delhi');
    expect(result).toContain('Clear skies in Delhi.');
    expect(searchMock).toHaveBeenCalledWith('weather in Delhi', {
      maxResults: 3,
      searchDepth: 'basic',
      includeAnswer: true,
    });
  });

  it('returns sources-only when Tavily answer is absent', async () => {
    searchMock.mockResolvedValue({
      results: [{ title: 'IPL Score', content: 'MI 180/4' }],
    });
    const tool = buildWebSearchTool();

    const result = await tool.tool.invoke({ query: 'IPL score today' });

    expect(result).not.toContain('Direct answer:');
    expect(result).toContain('IPL Score');
    expect(result).toContain('MI 180/4');
  });

  it('propagates SERVER_ERROR when Tavily search throws', async () => {
    searchMock.mockRejectedValue(new Error('network down'));
    const throwSpy = jest.spyOn(errors, 'throwServerError');
    const tool = buildWebSearchTool();

    await expect(tool.tool.invoke({ query: 'latest news' })).rejects.toMatchObject({
      type: JarvisErrorType.SERVER_ERROR,
      message: 'Tavily search failed: network down',
    });
    expect(throwSpy).toHaveBeenCalledWith('Tavily search failed: network down');
    throwSpy.mockRestore();
  });

  it('persists failed action row on Tavily error when context is provided', async () => {
    searchMock.mockRejectedValue(new Error('network down'));
    const tool = buildWebSearchTool(persistenceContext);

    await expect(tool.tool.invoke({ query: 'latest news' })).rejects.toThrow(
      'Tavily search failed: network down',
    );

    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'failed',
        errorDetails: 'Tavily search failed: network down',
      }),
    );
  });

  it('description contains every local phrase and do NOT use instruction', () => {
    const tool = buildWebSearchTool();

    for (const phrase of webSearchMetadata.phrases) {
      expect(tool.tool.description).toContain(phrase);
    }
    expect(tool.tool.description).toContain('Do NOT use');
  });

  it('does not call requestFromClient', async () => {
    searchMock.mockResolvedValue({
      answer: 'Yes',
      results: [{ title: 'Source', content: 'Content' }],
    });
    const tool = buildWebSearchTool();

    await tool.tool.invoke({ query: 'test query' });

    expect(requestFromClientMock).not.toHaveBeenCalled();
  });

  it('inserts pending action row when context is provided', async () => {
    const callOrder: string[] = [];
    insertMessageMock.mockImplementation(async () => {
      callOrder.push('insert');
    });
    searchMock.mockImplementation(async () => {
      callOrder.push('search');
      return {
        answer: 'Done',
        results: [{ title: 'Source', content: 'Content' }],
      };
    });
    const tool = buildWebSearchTool(persistenceContext);

    await tool.tool.invoke({ query: 'test query' });

    expect(insertMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: persistenceContext.conversationId,
        parentId: persistenceContext.userMessageId,
        sequenceNumber: persistenceContext.actionSequenceNumber,
        status: 'pending',
        actionName: 'WEB:SEARCH',
        actionExecutor: 'server',
        actionPayload: { query: 'test query' },
      }),
    );
    expect(callOrder).toEqual(['insert', 'search']);
  });

  it('skips persistence when context is absent', async () => {
    searchMock.mockResolvedValue({
      results: [{ title: 'Source', content: 'Content' }],
    });
    const tool = buildWebSearchTool();

    await tool.tool.invoke({ query: 'test query' });

    expect(insertMessageMock).not.toHaveBeenCalled();
    expect(searchMock).toHaveBeenCalled();
  });
});
