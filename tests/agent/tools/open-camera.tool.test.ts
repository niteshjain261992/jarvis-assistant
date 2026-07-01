jest.mock('@/repositories/message.repository.js', () => ({
  insertMessage: jest.fn().mockResolvedValue(undefined),
  updateMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/websocket/client-task-broker.js', () => ({
  requestFromClient: jest.fn(),
}));

import {
  buildOpenCameraTool,
  openCameraMetadata,
} from '@/agent/tools/open-camera.tool.js';
import * as messageRepository from '@/repositories/message.repository.js';
import { requestFromClient } from '@/websocket/client-task-broker.js';

const requestFromClientMock = requestFromClient as jest.MockedFunction<typeof requestFromClient>;
const insertMessageMock = messageRepository.insertMessage as jest.MockedFunction<
  typeof messageRepository.insertMessage
>;

function createMockWebSocket() {
  return { send: jest.fn() };
}

describe('buildOpenCameraTool', () => {
  beforeEach(() => {
    requestFromClientMock.mockReset();
    insertMessageMock.mockClear();
  });

  it('handler returns payload with client result after requestFromClient resolves', async () => {
    requestFromClientMock.mockResolvedValue({ opened: true });
    const ws = createMockWebSocket();
    const tool = buildOpenCameraTool(ws as never);

    await expect(tool.tool.invoke({})).resolves.toEqual({
      commandName: openCameraMetadata.commandName,
      executor: openCameraMetadata.executor,
      payload: { ...openCameraMetadata.payload, result: { opened: true } },
    });
    expect(requestFromClientMock).toHaveBeenCalledWith(
      ws,
      openCameraMetadata.commandName,
      openCameraMetadata.payload,
      openCameraMetadata.clientTimeoutMs,
    );
    expect(insertMessageMock).not.toHaveBeenCalled();
  });

  it('inserts pending action row when context is provided', async () => {
    requestFromClientMock.mockResolvedValue({ opened: true });
    const ws = createMockWebSocket();
    const context = {
      conversationId: 'conv-1',
      userMessageId: 'user-1',
      actionSequenceNumber: 3,
    };
    const tool = buildOpenCameraTool(ws as never, context);

    await tool.tool.invoke({});

    expect(insertMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: context.conversationId,
        parentId: context.userMessageId,
        sequenceNumber: context.actionSequenceNumber,
        status: 'pending',
        actionName: openCameraMetadata.commandName,
        actionExecutor: openCameraMetadata.executor,
        actionPayload: openCameraMetadata.payload,
      }),
    );
    expect(requestFromClientMock).toHaveBeenCalledWith(
      ws,
      openCameraMetadata.commandName,
      openCameraMetadata.payload,
      openCameraMetadata.clientTimeoutMs,
    );
  });

  it('propagates rejection when requestFromClient fails', async () => {
    requestFromClientMock.mockRejectedValue(new Error('timed out'));
    const tool = buildOpenCameraTool(createMockWebSocket() as never);

    await expect(tool.tool.invoke({})).rejects.toThrow('timed out');
  });

  it('description contains every local phrase', () => {
    const tool = buildOpenCameraTool(createMockWebSocket() as never);
    for (const phrase of openCameraMetadata.phrases) {
      expect(tool.tool.description).toContain(phrase);
    }
  });

  it('declares refetch-required freshness', () => {
    expect(openCameraMetadata.freshness.refetchRequired).toBe(true);
    expect(openCameraMetadata.freshness.reason.length).toBeGreaterThan(0);
  });
});
