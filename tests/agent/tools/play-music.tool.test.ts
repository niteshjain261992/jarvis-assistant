jest.mock('@/repositories/message.repository.js', () => ({
  insertMessage: jest.fn().mockResolvedValue(undefined),
  updateMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/websocket/client-task-broker.js', () => ({
  requestFromClient: jest.fn(),
}));

jest.mock('@/agent/tools/play-music/resolver.js', () => ({
  resolvePlayMusicUrl: jest.fn(),
}));

import {
  buildPlayMusicTool,
  DEFAULT_MUSIC_PLATFORM,
  normalizePlatform,
  playMusicMetadata,
} from '@/agent/tools/play-music.tool.js';
import { JarvisError, JarvisErrorType } from '@/errors/index.js';
import { resolvePlayMusicUrl } from '@/agent/tools/play-music/resolver.js';
import * as messageRepository from '@/repositories/message.repository.js';
import { requestFromClient } from '@/websocket/client-task-broker.js';

const requestFromClientMock = requestFromClient as jest.MockedFunction<typeof requestFromClient>;
const resolvePlayMusicUrlMock = resolvePlayMusicUrl as jest.MockedFunction<
  typeof resolvePlayMusicUrl
>;
const insertMessageMock = messageRepository.insertMessage as jest.MockedFunction<
  typeof messageRepository.insertMessage
>;
const updateMessageMock = messageRepository.updateMessage as jest.MockedFunction<
  typeof messageRepository.updateMessage
>;

const musicQuery = 'Bollywood party songs';
const resolvedTrack = {
  url: 'spotify:track:abc123',
  platform: 'spotify',
  title: 'Party Mix',
  id: 'abc123',
};

function createMockWebSocket() {
  return { send: jest.fn() };
}

describe('normalizePlatform', () => {
  it('normalizes common aliases to canonical platform names', () => {
    expect(normalizePlatform('You Tube')).toBe('youtube');
    expect(normalizePlatform('yt')).toBe('youtube');
    expect(normalizePlatform('Spotify')).toBe('spotify');
    expect(normalizePlatform('apple music')).toBe('apple_music');
  });

  it('passes through other popular platform names in snake_case', () => {
    expect(normalizePlatform('Gaana')).toBe('gaana');
  });
});

describe('buildPlayMusicTool', () => {
  beforeEach(() => {
    requestFromClientMock.mockReset();
    resolvePlayMusicUrlMock.mockReset();
    insertMessageMock.mockClear();
    updateMessageMock.mockClear();
    resolvePlayMusicUrlMock.mockResolvedValue(resolvedTrack);
  });

  it('handler resolves URL and returns payload with query, platform, url, and client result', async () => {
    requestFromClientMock.mockResolvedValue({ track: 'theme' });
    const ws = createMockWebSocket();
    const tool = buildPlayMusicTool(ws as never);

    await expect(
      tool.tool.invoke({ query: musicQuery, platform: 'spotify' }),
    ).resolves.toEqual({
      commandName: playMusicMetadata.commandName,
      executor: playMusicMetadata.executor,
      payload: {
        query: musicQuery,
        platform: 'spotify',
        url: resolvedTrack.url,
        title: resolvedTrack.title,
        id: resolvedTrack.id,
        result: { track: 'theme' },
      },
    });
    expect(resolvePlayMusicUrlMock).toHaveBeenCalledWith(musicQuery, 'spotify');
    expect(requestFromClientMock).toHaveBeenCalledWith(
      ws,
      playMusicMetadata.commandName,
      {
        query: musicQuery,
        platform: 'spotify',
        url: resolvedTrack.url,
        title: resolvedTrack.title,
        id: resolvedTrack.id,
      },
      playMusicMetadata.clientTimeoutMs,
    );
    expect(insertMessageMock).not.toHaveBeenCalled();
  });

  it('defaults platform to youtube when omitted', async () => {
    requestFromClientMock.mockResolvedValue({ track: 'theme' });
    resolvePlayMusicUrlMock.mockResolvedValue({
      url: 'https://www.youtube.com/watch?v=vid1',
      platform: 'youtube',
      title: 'Video',
      id: 'vid1',
    });
    const ws = createMockWebSocket();
    const tool = buildPlayMusicTool(ws as never);

    await tool.tool.invoke({ query: musicQuery });

    expect(resolvePlayMusicUrlMock).toHaveBeenCalledWith(musicQuery, DEFAULT_MUSIC_PLATFORM);
    expect(requestFromClientMock).toHaveBeenCalledWith(
      ws,
      playMusicMetadata.commandName,
      expect.objectContaining({
        query: musicQuery,
        platform: DEFAULT_MUSIC_PLATFORM,
        url: 'https://www.youtube.com/watch?v=vid1',
      }),
      playMusicMetadata.clientTimeoutMs,
    );
  });

  it('inserts pending action row when context is provided', async () => {
    requestFromClientMock.mockResolvedValue({ track: 'theme' });
    const ws = createMockWebSocket();
    const context = {
      conversationId: 'conv-1',
      userMessageId: 'user-1',
      actionSequenceNumber: 3,
    };
    const tool = buildPlayMusicTool(ws as never, context);

    await tool.tool.invoke({ query: musicQuery, platform: 'spotify' });

    expect(insertMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: context.conversationId,
        parentId: context.userMessageId,
        sequenceNumber: context.actionSequenceNumber,
        status: 'pending',
        actionName: playMusicMetadata.commandName,
        actionExecutor: 'client',
        actionPayload: expect.objectContaining({
          query: musicQuery,
          platform: 'spotify',
          url: resolvedTrack.url,
        }),
      }),
    );
    expect(requestFromClientMock).toHaveBeenCalledWith(
      ws,
      playMusicMetadata.commandName,
      expect.objectContaining({
        query: musicQuery,
        platform: 'spotify',
        url: resolvedTrack.url,
      }),
      playMusicMetadata.clientTimeoutMs,
    );
  });

  it('propagates rejection when resolvePlayMusicUrl fails', async () => {
    resolvePlayMusicUrlMock.mockRejectedValue(
      new JarvisError(JarvisErrorType.SERVER_ERROR, 'missing API key'),
    );
    const tool = buildPlayMusicTool(createMockWebSocket() as never);

    await expect(tool.tool.invoke({ query: musicQuery })).rejects.toThrow('missing API key');
    expect(requestFromClientMock).not.toHaveBeenCalled();
  });

  it('returns resolved payload when requestFromClient times out', async () => {
    requestFromClientMock.mockRejectedValue(
      new JarvisError(
        JarvisErrorType.CLIENT_TIMEOUT,
        'Client task timed out after 10000ms',
      ),
    );
    const tool = buildPlayMusicTool(createMockWebSocket() as never);

    await expect(tool.tool.invoke({ query: musicQuery, platform: 'spotify' })).resolves.toEqual({
      commandName: playMusicMetadata.commandName,
      executor: playMusicMetadata.executor,
      payload: {
        query: musicQuery,
        platform: 'spotify',
        url: resolvedTrack.url,
        title: resolvedTrack.title,
        id: resolvedTrack.id,
        result: {
          status: 'client_timeout',
          type: JarvisErrorType.CLIENT_TIMEOUT,
          message: 'Client task timed out after 10000ms',
        },
      },
    });
  });

  it('persists failed action row on CLIENT_TIMEOUT when context is provided', async () => {
    requestFromClientMock.mockRejectedValue(
      new JarvisError(
        JarvisErrorType.CLIENT_TIMEOUT,
        'Client task timed out after 10000ms',
      ),
    );
    const context = {
      conversationId: 'conv-1',
      userMessageId: 'user-1',
      actionSequenceNumber: 3,
    };
    const tool = buildPlayMusicTool(createMockWebSocket() as never, context);

    await expect(
      tool.tool.invoke({ query: musicQuery, platform: 'spotify' }),
    ).resolves.toMatchObject({
      commandName: playMusicMetadata.commandName,
      payload: expect.objectContaining({
        result: expect.objectContaining({ status: 'client_timeout' }),
      }),
    });

    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'failed',
        errorDetails: 'Client task timed out after 10000ms',
      }),
    );
  });

  it('propagates non-timeout rejection when requestFromClient fails', async () => {
    requestFromClientMock.mockRejectedValue(
      new JarvisError(JarvisErrorType.CLIENT_ERROR, 'Playback failed'),
    );
    const tool = buildPlayMusicTool(createMockWebSocket() as never);

    await expect(tool.tool.invoke({ query: musicQuery })).rejects.toThrow('Playback failed');
  });

  it('description contains every local phrase plus query and platform guidance', () => {
    const tool = buildPlayMusicTool(createMockWebSocket() as never);
    for (const phrase of playMusicMetadata.phrases) {
      expect(tool.tool.description).toContain(phrase);
    }
    expect(tool.tool.description).toContain('query');
    expect(tool.tool.description).toContain('youtube');
  });

  it('declares refetch-required freshness', () => {
    expect(playMusicMetadata.freshness.refetchRequired).toBe(true);
    expect(playMusicMetadata.freshness.reason.length).toBeGreaterThan(0);
  });
});
