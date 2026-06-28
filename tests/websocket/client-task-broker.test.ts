import type { WebSocket } from 'ws';

import { JarvisErrorType } from '@/errors/index.js';
import { successCodes } from '@/utils/api-response.js';
import {
  CLIENT_TASK_TIMEOUT_MS,
  rejectClientTask,
  requestFromClient,
  resolveClientTask,
} from '@/websocket/client-task-broker.js';

function createMockWebSocket(): WebSocket & { send: jest.Mock } {
  return { send: jest.fn() } as unknown as WebSocket & { send: jest.Mock };
}

function parseSentFrame(ws: WebSocket & { send: jest.Mock }) {
  return JSON.parse(ws.send.mock.calls[0][0] as string) as {
    code: string;
    message: string;
    data: {
      type: string;
      status: string;
      requestId: string;
      actionName: string;
      actionExecutor: string;
      actionPayload: Record<string, unknown>;
    };
  };
}

describe('client-task-broker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends an action request envelope with requestId, actionName, and actionPayload', () => {
    const ws = createMockWebSocket();

    void requestFromClient(ws, 'OPEN:CAMERA', { target: 'camera' });

    expect(ws.send).toHaveBeenCalledTimes(1);
    const frame = parseSentFrame(ws);
    expect(frame.code).toBe(successCodes.ACTION_REQUEST);
    expect(frame.message).toBe('Action requested');
    expect(frame.data).toMatchObject({
      type: 'action',
      status: 'pending',
      actionName: 'OPEN:CAMERA',
      actionExecutor: 'client',
      actionPayload: { target: 'camera' },
    });
    expect(typeof frame.data.requestId).toBe('string');
    expect(frame.data.requestId.length).toBeGreaterThan(0);
  });

  it('resolves when resolveClientTask is called with the matching requestId', async () => {
    const ws = createMockWebSocket();
    const promise = requestFromClient(ws, 'OFF:LIGHTS', { target: 'lights', state: 'off' });
    const frame = parseSentFrame(ws);

    resolveClientTask(frame.data.requestId, { success: true });

    await expect(promise).resolves.toEqual({ success: true });
  });

  it('rejects when rejectClientTask is called with the matching requestId', async () => {
    const ws = createMockWebSocket();
    const promise = requestFromClient(ws, 'OPEN:CAMERA', { target: 'camera' });
    const frame = parseSentFrame(ws);

    rejectClientTask(frame.data.requestId, 'camera unavailable');

    await expect(promise).rejects.toMatchObject({
      type: JarvisErrorType.CLIENT_ERROR,
      message: 'camera unavailable',
    });
  });

  it('rejects on timeout and removes the pending entry', async () => {
    const ws = createMockWebSocket();
    const promise = requestFromClient(ws, 'OPEN:CAMERA', { target: 'camera' });
    const frame = parseSentFrame(ws);

    jest.advanceTimersByTime(CLIENT_TASK_TIMEOUT_MS);

    await expect(promise).rejects.toMatchObject({
      type: JarvisErrorType.CLIENT_TIMEOUT,
      message: `Client task timed out after ${CLIENT_TASK_TIMEOUT_MS}ms`,
    });

    expect(() => resolveClientTask(frame.data.requestId, { late: true })).not.toThrow();
  });

  it('rejects on custom timeout at configured duration', async () => {
    const customTimeoutMs = 5_000;
    const ws = createMockWebSocket();
    const promise = requestFromClient(
      ws,
      'OPEN:CAMERA',
      { target: 'camera' },
      customTimeoutMs,
    );
    const frame = parseSentFrame(ws);

    jest.advanceTimersByTime(customTimeoutMs);

    await expect(promise).rejects.toMatchObject({
      type: JarvisErrorType.CLIENT_TIMEOUT,
      message: `Client task timed out after ${customTimeoutMs}ms`,
    });

    expect(() => resolveClientTask(frame.data.requestId, { late: true })).not.toThrow();
  });

  it('resolves before custom timeout expires', async () => {
    const customTimeoutMs = 30_000;
    const ws = createMockWebSocket();
    const promise = requestFromClient(
      ws,
      'OPEN:CAMERA',
      { target: 'camera' },
      customTimeoutMs,
    );
    const frame = parseSentFrame(ws);

    jest.advanceTimersByTime(15_000);
    resolveClientTask(frame.data.requestId, { opened: true });

    await expect(promise).resolves.toEqual({ opened: true });
  });

  it('no-ops resolve and reject for unknown requestIds', () => {
    expect(() => resolveClientTask('unknown-id', { ok: true })).not.toThrow();
    expect(() => rejectClientTask('unknown-id', 'error')).not.toThrow();
  });
});
