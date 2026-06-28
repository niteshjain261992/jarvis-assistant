jest.mock('@/repositories/message.repository.js', () => ({
  insertMessage: jest.fn().mockResolvedValue(undefined),
  updateMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/websocket/client-task-broker.js', () => ({
  requestFromClient: jest.fn(),
}));

import {
  buildOffLightsTool,
  offLightsMetadata,
} from '@/agent/tools/off-lights.tool.js';
import * as messageRepository from '@/repositories/message.repository.js';
import { requestFromClient } from '@/websocket/client-task-broker.js';

const requestFromClientMock = requestFromClient as jest.MockedFunction<typeof requestFromClient>;
const insertMessageMock = messageRepository.insertMessage as jest.MockedFunction<
  typeof messageRepository.insertMessage
>;

function createMockWebSocket() {
  return { send: jest.fn() };
}

describe('buildOffLightsTool', () => {
  beforeEach(() => {
    requestFromClientMock.mockReset();
    insertMessageMock.mockClear();
  });

  it('handler returns payload with client result after requestFromClient resolves', async () => {
    requestFromClientMock.mockResolvedValue({ switchedOff: true });
    const ws = createMockWebSocket();
    const tool = buildOffLightsTool(ws as never);

    await expect(tool.tool.invoke({})).resolves.toEqual({
      commandName: offLightsMetadata.commandName,
      executor: offLightsMetadata.executor,
      payload: { ...offLightsMetadata.payload, result: { switchedOff: true } },
    });
    expect(requestFromClientMock).toHaveBeenCalledWith(
      ws,
      offLightsMetadata.commandName,
      offLightsMetadata.payload,
      offLightsMetadata.clientTimeoutMs,
    );
    expect(insertMessageMock).not.toHaveBeenCalled();
  });

  it('inserts pending action row when context is provided', async () => {
    requestFromClientMock.mockResolvedValue({ switchedOff: true });
    const ws = createMockWebSocket();
    const context = {
      conversationId: 'conv-1',
      userMessageId: 'user-1',
      actionSequenceNumber: 3,
    };
    const tool = buildOffLightsTool(ws as never, context);

    await tool.tool.invoke({});

    expect(insertMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: context.conversationId,
        parentId: context.userMessageId,
        sequenceNumber: context.actionSequenceNumber,
        status: 'pending',
        actionName: offLightsMetadata.commandName,
        actionExecutor: offLightsMetadata.executor,
        actionPayload: offLightsMetadata.payload,
      }),
    );
    expect(requestFromClientMock).toHaveBeenCalledWith(
      ws,
      offLightsMetadata.commandName,
      offLightsMetadata.payload,
      offLightsMetadata.clientTimeoutMs,
    );
  });

  it('propagates rejection when requestFromClient fails', async () => {
    requestFromClientMock.mockRejectedValue(new Error('lights unreachable'));
    const tool = buildOffLightsTool(createMockWebSocket() as never);

    await expect(tool.tool.invoke({})).rejects.toThrow('lights unreachable');
  });

  it('description contains every local phrase', () => {
    const tool = buildOffLightsTool(createMockWebSocket() as never);
    for (const phrase of offLightsMetadata.phrases) {
      expect(tool.tool.description).toContain(phrase);
    }
  });
});
