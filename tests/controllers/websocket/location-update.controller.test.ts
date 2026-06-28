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

jest.mock('@/services/location.service.js', () => ({
  processLocationUpdate: jest.fn(),
}));

import WebSocket from 'ws';

import { handleLocationUpdate } from '@/controllers/websocket/location-update.controller.js';
import * as locationService from '@/services/location.service.js';
import { ErrorResponse } from '@/utils/api-response.js';
import { logger } from '@/utils/logger.js';

const processLocationUpdateMock = locationService.processLocationUpdate as jest.MockedFunction<
  typeof locationService.processLocationUpdate
>;
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

function locationUpdateEnvelope() {
  return {
    type: 'LOCATION_UPDATE' as const,
    message_id: 'loc-7g8h9i',
    timestamp: 1_719_311_010,
    payload: {
      latitude: 28.4595,
      longitude: 77.0266,
      accuracy_meters: 12.5,
      speed_kmh: 0.0,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handleLocationUpdate', () => {
  it('does not send an outbound frame on success', async () => {
    const ws = createMockWebSocket();
    processLocationUpdateMock.mockResolvedValue(undefined);

    await handleLocationUpdate({ ws, envelope: locationUpdateEnvelope() });

    expect(processLocationUpdateMock).toHaveBeenCalledWith(locationUpdateEnvelope());
    expect(ws.send).not.toHaveBeenCalled();
  });

  it('sends NOT_FOUND for operational AppError', async () => {
    const ws = createMockWebSocket();
    processLocationUpdateMock.mockRejectedValue(ErrorResponse.NOT_FOUND('User not found'));

    await handleLocationUpdate({ ws, envelope: locationUpdateEnvelope() });

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('NOT_FOUND');
  });

  it('sends INTERNAL_SERVER_ERROR for unexpected errors', async () => {
    const ws = createMockWebSocket();
    processLocationUpdateMock.mockRejectedValue(new Error('boom'));

    await handleLocationUpdate({ ws, envelope: locationUpdateEnvelope() });

    const envelope = parseSentEnvelope(ws);
    expect(envelope.code).toBe('INTERNAL_SERVER_ERROR');
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Unexpected WebSocket location update error',
    );
  });
});
