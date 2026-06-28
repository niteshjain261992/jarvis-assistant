jest.mock('@/websocket/client-task-broker.js', () => ({
  resolveClientTask: jest.fn(),
  rejectClientTask: jest.fn(),
}));

import WebSocket from 'ws';

import { handleActionAck } from '@/controllers/websocket/action-ack.controller.js';
import { rejectClientTask, resolveClientTask } from '@/websocket/client-task-broker.js';

const resolveClientTaskMock = resolveClientTask as jest.MockedFunction<typeof resolveClientTask>;
const rejectClientTaskMock = rejectClientTask as jest.MockedFunction<typeof rejectClientTask>;

function createMockWebSocket(): WebSocket & { send: jest.Mock } {
  return { send: jest.fn() } as unknown as WebSocket & { send: jest.Mock };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handleActionAck', () => {
  it('resolves the broker on SUCCESS without sending a frame', async () => {
    const ws = createMockWebSocket();
    const payload = {
      original_server_message_id: 'req-1',
      action_executed: 'PLAY_MUSIC',
      status: 'SUCCESS' as const,
      error_details: null,
    };

    await handleActionAck({
      ws,
      envelope: {
        type: 'ACTION_ACK',
        message_id: 'ack-1',
        timestamp: 1_719_311_005,
        payload,
      },
    });

    expect(resolveClientTaskMock).toHaveBeenCalledWith('req-1', payload);
    expect(rejectClientTaskMock).not.toHaveBeenCalled();
    expect(ws.send).not.toHaveBeenCalled();
  });

  it('rejects the broker on FAILURE without sending a frame', async () => {
    const ws = createMockWebSocket();

    await handleActionAck({
      ws,
      envelope: {
        type: 'ACTION_ACK',
        message_id: 'ack-2',
        timestamp: 1_719_311_005,
        payload: {
          original_server_message_id: 'req-2',
          action_executed: 'PLAY_MUSIC',
          status: 'FAILURE',
          error_details: 'Playback failed',
        },
      },
    });

    expect(rejectClientTaskMock).toHaveBeenCalledWith('req-2', 'Playback failed');
    expect(resolveClientTaskMock).not.toHaveBeenCalled();
    expect(ws.send).not.toHaveBeenCalled();
  });
});
