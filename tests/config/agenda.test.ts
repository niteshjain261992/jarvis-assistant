const mockConnection = { readyState: 1 };

jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    connection: mockConnection,
  },
}));

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

const startMock = jest.fn().mockResolvedValue(undefined);
const stopMock = jest.fn().mockResolvedValue(undefined);
const defineMock = jest.fn();

jest.mock('agenda', () => ({
  Agenda: jest.fn().mockImplementation(() => ({
    start: startMock,
    stop: stopMock,
    define: defineMock,
  })),
}));

jest.mock('@agendajs/mongo-backend', () => ({
  MongoBackend: jest.fn(),
}));

jest.mock('@/jobs/conversation-summary.job.js', () => ({
  registerConversationSummaryJob: jest.fn(),
}));

import { buildMongoAddress, getAgenda, startAgenda, stopAgenda } from '@/config/agenda.js';
import { registerConversationSummaryJob } from '@/jobs/conversation-summary.job.js';

const registerConversationSummaryJobMock =
  registerConversationSummaryJob as jest.MockedFunction<typeof registerConversationSummaryJob>;

describe('agenda config', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockConnection.readyState = 1;
    await stopAgenda();
  });

  it('returns null before Agenda is started', () => {
    expect(getAgenda()).toBeNull();
  });

  it('builds a mongo address with the configured database name', () => {
    expect(buildMongoAddress('mongodb://127.0.0.1:27017', 'jarvis')).toBe(
      'mongodb://127.0.0.1:27017/jarvis',
    );
  });

  it('preserves an existing database path and query string', () => {
    expect(buildMongoAddress('mongodb://127.0.0.1:27017/existing?retryWrites=true')).toBe(
      'mongodb://127.0.0.1:27017/existing?retryWrites=true',
    );
  });

  it('starts Agenda when MongoDB is connected', async () => {
    const agenda = await startAgenda();

    expect(agenda).toBeDefined();
    expect(registerConversationSummaryJobMock).toHaveBeenCalledWith(agenda);
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(getAgenda()).toBe(agenda);
  });

  it('returns the existing Agenda instance on subsequent starts', async () => {
    const first = await startAgenda();
    const second = await startAgenda();

    expect(second).toBe(first);
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it('throws when MongoDB is not connected', async () => {
    mockConnection.readyState = 0;

    await expect(startAgenda()).rejects.toThrow('MongoDB must be connected before starting Agenda');
  });

  it('stops Agenda and clears the singleton', async () => {
    await startAgenda();
    await stopAgenda();

    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(getAgenda()).toBeNull();
  });
});
