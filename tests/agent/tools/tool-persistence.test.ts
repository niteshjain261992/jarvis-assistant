jest.mock('@/repositories/message.repository.js', () => ({
  insertMessage: jest.fn().mockResolvedValue(undefined),
  updateMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('@/errors/index.js', () => {
  const actual = jest.requireActual<typeof import('@/errors/index.js')>('@/errors/index.js');
  return {
    ...actual,
    isJarvisError: jest.fn(),
  };
});

import { JarvisError, JarvisErrorType, isJarvisError } from '@/errors/index.js';
import * as messageRepository from '@/repositories/message.repository.js';
import { withToolPersistence } from '@/agent/tools/tool-persistence.js';
import { logger } from '@/utils/logger.js';

const insertMessageMock = messageRepository.insertMessage as jest.MockedFunction<
  typeof messageRepository.insertMessage
>;
const updateMessageMock = messageRepository.updateMessage as jest.MockedFunction<
  typeof messageRepository.updateMessage
>;
const isJarvisErrorMock = isJarvisError as jest.MockedFunction<typeof isJarvisError>;

const context = {
  conversationId: 'conv-1',
  userMessageId: 'user-msg-1',
  actionSequenceNumber: 3,
};

describe('withToolPersistence', () => {
  beforeEach(() => {
    insertMessageMock.mockClear();
    updateMessageMock.mockClear();
    isJarvisErrorMock.mockReset();
    isJarvisErrorMock.mockReturnValue(false);
    (logger.error as jest.Mock).mockClear();
  });

  it('calls insertMessage with status pending before execute', async () => {
    const executeOrder: string[] = [];
    insertMessageMock.mockImplementation(async () => {
      executeOrder.push('insert');
    });
    const execute = jest.fn(async () => {
      executeOrder.push('execute');
      return { ok: true };
    });

    await withToolPersistence(context, 'OPEN:CAMERA', { target: 'camera' }, 'client', execute);

    expect(insertMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: context.conversationId,
        parentId: context.userMessageId,
        sequenceNumber: context.actionSequenceNumber,
        status: 'pending',
        type: 'action',
        role: 'assistant',
        actionName: 'OPEN:CAMERA',
        actionExecutor: 'client',
        actionPayload: { target: 'camera' },
      }),
    );
    expect(executeOrder).toEqual(['insert', 'execute']);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('updates to completed on success and returns execute result', async () => {
    const result = { opened: true };
    const execute = jest.fn().mockResolvedValue(result);

    await expect(
      withToolPersistence(context, 'OPEN:CAMERA', { target: 'camera' }, 'client', execute),
    ).resolves.toEqual(result);

    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'completed',
        actionResult: result,
      }),
    );
  });

  it('updates to failed and re-throws on error', async () => {
    const error = new Error('timed out');
    const execute = jest.fn().mockRejectedValue(error);

    await expect(
      withToolPersistence(context, 'OPEN:CAMERA', { target: 'camera' }, 'client', execute),
    ).rejects.toBe(error);

    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'failed',
        errorDetails: 'timed out',
      }),
    );
  });

  it('uses JarvisError message when isJarvisError returns true', async () => {
    const error = new JarvisError(JarvisErrorType.CLIENT_TIMEOUT, 'Client task timed out');
    isJarvisErrorMock.mockReturnValue(true);
    const execute = jest.fn().mockRejectedValue(error);

    await expect(
      withToolPersistence(context, 'PLAY:MUSIC', { query: 'songs' }, 'client', execute),
    ).rejects.toBe(error);

    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'failed',
        errorDetails: 'Client task timed out',
      }),
    );
  });

  it('still calls execute when insertMessage fails', async () => {
    insertMessageMock.mockRejectedValue(new Error('db down'));
    const execute = jest.fn().mockResolvedValue({ ok: true });

    await expect(
      withToolPersistence(context, 'OFF:LIGHTS', { target: 'lights' }, 'client', execute),
    ).resolves.toEqual({ ok: true });

    expect(logger.error).toHaveBeenCalled();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('still returns result when complete update fails', async () => {
    updateMessageMock.mockRejectedValue(new Error('db down'));
    const result = { ok: true };
    const execute = jest.fn().mockResolvedValue(result);

    await expect(
      withToolPersistence(context, 'OFF:LIGHTS', { target: 'lights' }, 'client', execute),
    ).resolves.toEqual(result);

    expect(logger.error).toHaveBeenCalled();
  });

  it('still re-throws when fail update fails', async () => {
    updateMessageMock.mockRejectedValue(new Error('db down'));
    const error = new Error('client error');
    const execute = jest.fn().mockRejectedValue(error);

    await expect(
      withToolPersistence(context, 'OFF:LIGHTS', { target: 'lights' }, 'client', execute),
    ).rejects.toBe(error);

    expect(logger.error).toHaveBeenCalled();
  });

  it('passes plain objects as actionResult as-is', async () => {
    const result = { nested: { value: 1 } };
    await withToolPersistence(context, 'OPEN:CAMERA', {}, 'client', async () => result);

    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ actionResult: result }),
    );
  });

  it('wraps primitive results as { value: result }', async () => {
    await withToolPersistence(context, 'WEB:SEARCH', { query: 'test' }, 'server', async () => 'text');

    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ actionResult: { value: 'text' } }),
    );
  });

  it('wraps array results as { value: result }', async () => {
    const result = [1, 2, 3];
    await withToolPersistence(context, 'WEB:SEARCH', { query: 'test' }, 'server', async () => result);

    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ actionResult: { value: result } }),
    );
  });
});
