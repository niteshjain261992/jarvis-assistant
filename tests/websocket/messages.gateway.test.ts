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

jest.mock('@/services/location.service.js', () => ({
  processLocationUpdate: jest.fn(),
}));

import WebSocket from 'ws';
import { createServer } from 'node:http';

import * as messageService from '@/services/message.service.js';
import * as locationService from '@/services/location.service.js';
import { attachMessageWebSocket, handleRawMessage } from '@/websocket/messages.gateway.js';
import { ErrorResponse } from '@/utils/api-response.js';
import { logger } from '@/utils/logger.js';

const createMessageMock = messageService.createMessage as jest.MockedFunction<
  typeof messageService.createMessage
>;
const processLocationUpdateMock = locationService.processLocationUpdate as jest.MockedFunction<
  typeof locationService.processLocationUpdate
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

function userPromptFrame(text: string, overrides: Record<string, unknown> = {}) {
  return {
    type: 'USER_PROMPT',
    message_id: 'msg-1',
    timestamp: 1_719_311_000,
    payload: {
      text,
      input_method: 'chat',
    },
    ...overrides,
  };
}

function actionAckFrame(overrides: Record<string, unknown> = {}) {
  return {
    type: 'ACTION_ACK',
    message_id: 'ack-1',
    timestamp: 1_719_311_005,
    payload: {
      original_server_message_id: 'req-1',
      action_executed: 'PLAY_MUSIC',
      status: 'SUCCESS',
      error_details: null,
    },
    ...overrides,
  };
}

function locationUpdateFrame(overrides: Record<string, unknown> = {}) {
  return {
    type: 'LOCATION_UPDATE',
    message_id: 'loc-1',
    timestamp: 1_719_311_010,
    payload: {
      latitude: 28.4595,
      longitude: 77.0266,
      accuracy_meters: 12.5,
      speed_kmh: 0.0,
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handleRawMessage', () => {
  it('returns MESSAGE_COMPLETED for a valid USER_PROMPT envelope', async () => {
    const ws = createMockWebSocket();
    createMessageMock.mockResolvedValue({
      conversationId: 'conv-1',
      type: 'text',
      status: 'completed',
      content: 'Hello, Sir.',
    });

    await handleRawMessage(ws, JSON.stringify(userPromptFrame('hello')));

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('MESSAGE_COMPLETED');
    expect(envelope.data).toMatchObject({
      conversationId: 'conv-1',
      status: 'completed',
      content: 'Hello, Sir.',
    });
    expect(createMessageMock).toHaveBeenCalledWith('hello', ws);
    expect(loggerDebugMock).toHaveBeenCalledWith({ promptLength: 5 }, 'Message request accepted');
  });

  it('returns BAD_REQUEST for malformed JSON', async () => {
    const ws = createMockWebSocket();

    await handleRawMessage(ws, '{not json');

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('BAD_REQUEST');
    expect(envelope.message).toBe('Invalid JSON frame');
    expect(createMessageMock).not.toHaveBeenCalled();
  });

  it('returns BAD_REQUEST for legacy flat prompt frames', async () => {
    const ws = createMockWebSocket();

    await handleRawMessage(ws, JSON.stringify({ prompt: 'hello' }));

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('BAD_REQUEST');
    expect(createMessageMock).not.toHaveBeenCalled();
  });

  it('returns BAD_REQUEST for an invalid payload.text', async () => {
    const ws = createMockWebSocket();

    await handleRawMessage(ws, JSON.stringify(userPromptFrame('   ')));

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('BAD_REQUEST');
    expect(envelope.message).toContain('payload.text');
    expect(createMessageMock).not.toHaveBeenCalled();
  });

  it('returns MESSAGE_FAILED when the pipeline reports failure', async () => {
    const ws = createMockWebSocket();
    createMessageMock.mockResolvedValue({
      conversationId: 'conv-1',
      type: 'text',
      status: 'failed',
      errorDetails: 'Image intent not supported',
    });

    await handleRawMessage(ws, JSON.stringify(userPromptFrame('draw a cat')));

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('MESSAGE_FAILED');
    expect(envelope.data.errorDetails).toBe('Image intent not supported');
  });

  it('returns LLM error envelope for operational AppError', async () => {
    const ws = createMockWebSocket();
    createMessageMock.mockRejectedValue(ErrorResponse.LLM_UNAVAILABLE());

    await handleRawMessage(ws, JSON.stringify(userPromptFrame('open camera')));

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('LLM_UNAVAILABLE');
    expect(envelope.data).toEqual({});
  });

  it('returns INTERNAL_SERVER_ERROR for unexpected errors', async () => {
    const ws = createMockWebSocket();
    createMessageMock.mockRejectedValue(new Error('boom'));

    await handleRawMessage(ws, JSON.stringify(userPromptFrame('hello')));

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('INTERNAL_SERVER_ERROR');
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Unexpected WebSocket message error',
    );
  });

  it('routes ACTION_ACK to the broker without calling createMessage', async () => {
    const ws = createMockWebSocket();

    await handleRawMessage(ws, JSON.stringify(actionAckFrame()));

    expect(createMessageMock).not.toHaveBeenCalled();
    expect(ws.send).not.toHaveBeenCalled();
  });

  it('routes ACTION_ACK FAILURE to the broker without calling createMessage', async () => {
    const ws = createMockWebSocket();

    await handleRawMessage(
      ws,
      JSON.stringify(
        actionAckFrame({
          payload: {
            original_server_message_id: 'req-2',
            action_executed: 'PLAY_MUSIC',
            status: 'FAILURE',
            error_details: 'failed',
          },
        }),
      ),
    );

    expect(createMessageMock).not.toHaveBeenCalled();
    expect(ws.send).not.toHaveBeenCalled();
  });

  it('routes LOCATION_UPDATE to the location service without calling createMessage', async () => {
    const ws = createMockWebSocket();
    processLocationUpdateMock.mockResolvedValue(undefined);

    await handleRawMessage(ws, JSON.stringify(locationUpdateFrame()));

    expect(processLocationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LOCATION_UPDATE',
        payload: expect.objectContaining({
          latitude: 28.4595,
          longitude: 77.0266,
        }),
      }),
    );
    expect(createMessageMock).not.toHaveBeenCalled();
    expect(ws.send).not.toHaveBeenCalled();
  });
});

describe('attachMessageWebSocket', () => {
  it('attaches a WebSocketServer to the HTTP server', async () => {
    const server = createServer();
    const wss = attachMessageWebSocket(server);

    await new Promise<void>((resolve) => {
      server.listen(0, resolve);
    });

    expect(wss).toBeDefined();
    wss.close();
    server.close();
  });

  it('handles inbound frames on a live connection', async () => {
    createMessageMock.mockResolvedValue({
      conversationId: 'conv-live',
      type: 'text',
      status: 'completed',
      content: 'Hello, Sir.',
    });

    const server = createServer();
    const wss = attachMessageWebSocket(server);

    await new Promise<void>((resolve) => {
      server.listen(0, resolve);
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a port');
    }

    const client = new WebSocket(`ws://127.0.0.1:${address.port}`);
    await new Promise<void>((resolve, reject) => {
      client.once('open', () => resolve());
      client.once('error', reject);
    });

    client.send(JSON.stringify(userPromptFrame('hello live')));

    await new Promise<void>((resolve) => {
      client.once('message', () => resolve());
    });

    expect(createMessageMock).toHaveBeenCalledWith('hello live', expect.any(Object));

    for (const socket of wss.clients) {
      socket.emit('error', new Error('socket error'));
      socket.emit('close');
    }

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'WebSocket error',
    );
    expect(loggerDebugMock).toHaveBeenCalledWith('WebSocket client disconnected');

    client.close();
    wss.close();
    server.close();
  });
});
