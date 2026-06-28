jest.mock('@/utils/logger.js', () => ({
  logger: {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  },
}));

jest.mock('@/services/message.service.js', () => ({
  createMessage: jest.fn(),
}));

import WebSocket from 'ws';

import { handleUserPrompt } from '@/controllers/websocket/user-prompt.controller.js';
import * as messageService from '@/services/message.service.js';
import { ErrorResponse } from '@/utils/api-response.js';
import { logger } from '@/utils/logger.js';

const createMessageMock = messageService.createMessage as jest.MockedFunction<
  typeof messageService.createMessage
>;
const loggerDebugMock = logger.debug as jest.MockedFunction<typeof logger.debug>;
const loggerErrorMock = logger.error as jest.MockedFunction<typeof logger.error>;

function createMockWebSocket(): WebSocket & { send: jest.Mock } {
  return { send: jest.fn() } as unknown as WebSocket & { send: jest.Mock };
}

function parseSentEnvelope(ws: WebSocket & { send: jest.Mock }) {
  expect(ws.send).toHaveBeenCalledTimes(1);
  return JSON.parse(ws.send.mock.calls[0][0] as string) as {
    code: string;
    message: string;
    data: Record<string, unknown>;
  };
}

function userPromptEnvelope(text: string) {
  return {
    type: 'USER_PROMPT' as const,
    message_id: 'msg-1',
    timestamp: 1_719_311_000,
    payload: {
      text,
      input_method: 'chat' as const,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handleUserPrompt', () => {
  it('sends MESSAGE_COMPLETED when createMessage succeeds', async () => {
    const ws = createMockWebSocket();
    createMessageMock.mockResolvedValue({
      conversationId: 'conv-1',
      type: 'text',
      status: 'completed',
      content: 'Hello, Sir.',
    });

    await handleUserPrompt({ ws, envelope: userPromptEnvelope('hello') });

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('MESSAGE_COMPLETED');
    expect(createMessageMock).toHaveBeenCalledWith('hello', ws);
    expect(loggerDebugMock).toHaveBeenCalledWith({ promptLength: 5 }, 'Message request accepted');
  });

  it('sends MESSAGE_FAILED when the pipeline reports failure', async () => {
    const ws = createMockWebSocket();
    createMessageMock.mockResolvedValue({
      conversationId: 'conv-1',
      type: 'text',
      status: 'failed',
      errorDetails: 'Image intent not supported',
    });

    await handleUserPrompt({ ws, envelope: userPromptEnvelope('draw a cat') });

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('MESSAGE_FAILED');
  });

  it('sends LLM error envelope for operational AppError', async () => {
    const ws = createMockWebSocket();
    createMessageMock.mockRejectedValue(ErrorResponse.LLM_UNAVAILABLE());

    await handleUserPrompt({ ws, envelope: userPromptEnvelope('open camera') });

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('LLM_UNAVAILABLE');
  });

  it('sends INTERNAL_SERVER_ERROR for unexpected errors', async () => {
    const ws = createMockWebSocket();
    createMessageMock.mockRejectedValue(new Error('boom'));

    await handleUserPrompt({ ws, envelope: userPromptEnvelope('hello') });

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('INTERNAL_SERVER_ERROR');
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Unexpected WebSocket message error',
    );
  });
});
