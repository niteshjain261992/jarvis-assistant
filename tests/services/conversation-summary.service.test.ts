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

jest.mock('@/config/agenda.js', () => ({
  getAgenda: jest.fn(),
}));

jest.mock('@/repositories/conversation.repository.js', () => ({
  findConversationById: jest.fn(),
  updateConversation: jest.fn(),
}));

jest.mock('@/services/ollama.service.js', () => ({
  summarizeText: jest.fn(),
}));

import { getAgenda } from '@/config/agenda.js';
import * as conversationRepository from '@/repositories/conversation.repository.js';
import {
  buildExchangeText,
  enqueueConversationSummary,
  formatAssistantText,
  processSummaryJob,
} from '@/services/conversation-summary.service.js';
import { summarizeText } from '@/services/ollama.service.js';
import { logger } from '@/utils/logger.js';

const loggerDebugMock = logger.debug as jest.MockedFunction<typeof logger.debug>;

const getAgendaMock = getAgenda as jest.MockedFunction<typeof getAgenda>;
const findConversationByIdMock = conversationRepository.findConversationById as jest.MockedFunction<
  typeof conversationRepository.findConversationById
>;
const updateConversationMock = conversationRepository.updateConversation as jest.MockedFunction<
  typeof conversationRepository.updateConversation
>;
const summarizeTextMock = summarizeText as jest.MockedFunction<typeof summarizeText>;

const nowMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  summarizeTextMock.mockResolvedValue('User asked about Paris. Jarvis answered.');
  updateConversationMock.mockResolvedValue(undefined);
  nowMock.mockResolvedValue(undefined);
  getAgendaMock.mockReturnValue({ now: nowMock } as never);
});

describe('buildExchangeText', () => {
  it('formats user and assistant lines', () => {
    expect(buildExchangeText('hello', 'Hi, Sir.')).toBe('user: hello\nassistant: Hi, Sir.');
  });
});

describe('formatAssistantText', () => {
  it('returns text content for completed text responses', () => {
    expect(
      formatAssistantText({
        type: 'text',
        status: 'completed',
        content: 'Paris is the capital of France, Sir.',
      }),
    ).toBe('Paris is the capital of France, Sir.');
  });

  it('returns action details for completed action responses', () => {
    expect(
      formatAssistantText({
        type: 'action',
        status: 'completed',
        actionName: 'OPEN:CAMERA',
        actionPayload: { target: 'camera' },
        actionResult: { status: 'ok' },
      }),
    ).toBe('OPEN:CAMERA {"target":"camera"} {"status":"ok"}');
  });

  it('returns empty string for failed responses', () => {
    expect(formatAssistantText({ type: 'text', status: 'failed' })).toBe('');
  });
});

describe('processSummaryJob', () => {
  it('creates the first summary from the exchange text', async () => {
    findConversationByIdMock.mockResolvedValue({
      _id: 'conv-1',
      source: 'mobile',
      status: 'active',
      lastSequenceNumber: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await processSummaryJob({
      conversationId: 'conv-1',
      exchangeText: 'user: hello\nassistant: Hi, Sir.',
    });

    expect(summarizeTextMock).toHaveBeenCalledWith('user: hello\nassistant: Hi, Sir.');
    expect(updateConversationMock).toHaveBeenCalledWith('conv-1', {
      summary: 'User asked about Paris. Jarvis answered.',
    });
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1', summaryJob: 'persisted', rolling: false }),
      'Conversation summary updated',
    );
  });

  it('rolls the summary forward when one already exists', async () => {
    findConversationByIdMock.mockResolvedValue({
      _id: 'conv-1',
      source: 'mobile',
      status: 'active',
      summary: 'Earlier chat about greetings.',
      lastSequenceNumber: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await processSummaryJob({
      conversationId: 'conv-1',
      exchangeText: 'user: open camera\nassistant: OPEN:CAMERA',
    });

    expect(summarizeTextMock).toHaveBeenCalledWith(
      'Previous summary:\nEarlier chat about greetings.\n\nNew exchange:\nuser: open camera\nassistant: OPEN:CAMERA',
    );
  });

  it('logs and skips persistence when summarization fails', async () => {
    findConversationByIdMock.mockResolvedValue({
      _id: 'conv-1',
      source: 'mobile',
      status: 'active',
      lastSequenceNumber: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    summarizeTextMock.mockRejectedValue(new Error('LLM down'));

    await processSummaryJob({
      conversationId: 'conv-1',
      exchangeText: 'user: hello\nassistant: Hi, Sir.',
    });

    expect(updateConversationMock).not.toHaveBeenCalled();
  });

  it('skips update when the conversation is missing', async () => {
    findConversationByIdMock.mockResolvedValue(null);

    await processSummaryJob({
      conversationId: 'missing',
      exchangeText: 'user: hello\nassistant: Hi',
    });

    expect(summarizeTextMock).not.toHaveBeenCalled();
    expect(updateConversationMock).not.toHaveBeenCalled();
  });
});

describe('enqueueConversationSummary', () => {
  it('schedules a summary job for completed exchanges', async () => {
    await enqueueConversationSummary('conv-1', 'hello', {
      type: 'text',
      status: 'completed',
      content: 'Hi, Sir.',
    });

    expect(nowMock).toHaveBeenCalledWith('update-conversation-summary', {
      conversationId: 'conv-1',
      exchangeText: 'user: hello\nassistant: Hi, Sir.',
    });
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1', summaryJob: 'enqueued' }),
      'Summary job enqueued',
    );
  });

  it('does not schedule a job for failed exchanges', async () => {
    await enqueueConversationSummary('conv-1', 'draw a cat', {
      type: 'text',
      status: 'failed',
    });

    expect(nowMock).not.toHaveBeenCalled();
  });

  it('does not schedule a job when Agenda is not started', async () => {
    getAgendaMock.mockReturnValue(null);

    await enqueueConversationSummary('conv-1', 'hello', {
      type: 'text',
      status: 'completed',
      content: 'Hi, Sir.',
    });

    expect(nowMock).not.toHaveBeenCalled();
  });

  it('does not schedule a job when assistant text is empty', async () => {
    await enqueueConversationSummary('conv-1', 'hello', {
      type: 'text',
      status: 'completed',
    });

    expect(nowMock).not.toHaveBeenCalled();
  });
});
