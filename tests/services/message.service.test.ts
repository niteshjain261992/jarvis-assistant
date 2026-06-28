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

jest.mock('@/repositories/message.repository.js', () => ({
  insertMessage: jest.fn(),
  findMessageById: jest.fn(),
  findLatestActionMessageByParentId: jest.fn(),
  findMessagesByConversationId: jest.fn(),
  findRecentMessagesByConversationId: jest.fn(),
  updateMessage: jest.fn(),
}));

jest.mock('@/repositories/conversation.repository.js', () => ({
  findActiveConversation: jest.fn(),
  insertConversation: jest.fn(),
  updateConversation: jest.fn(),
}));

jest.mock('@/repositories/user.repository.js', () => ({
  findSingleUser: jest.fn(),
}));

jest.mock('@/agent/agent-runner.js', () => ({
  runAgent: jest.fn(),
}));

jest.mock('@/services/conversation-summary.service.js', () => ({
  enqueueConversationSummary: jest.fn(),
}));

import { runAgent } from '@/agent/agent-runner.js';
import type { WebSocket } from 'ws';
import * as conversationRepository from '@/repositories/conversation.repository.js';
import * as messageRepository from '@/repositories/message.repository.js';
import * as userRepository from '@/repositories/user.repository.js';
import { enqueueConversationSummary } from '@/services/conversation-summary.service.js';
import * as messageService from '@/services/message.service.js';
import { ErrorResponse } from '@/utils/api-response.js';
import { logger } from '@/utils/logger.js';

const loggerDebugMock = logger.debug as jest.MockedFunction<typeof logger.debug>;
const loggerErrorMock = logger.error as jest.MockedFunction<typeof logger.error>;

const insertMessageMock = messageRepository.insertMessage as jest.MockedFunction<
  typeof messageRepository.insertMessage
>;
const findRecentMessagesByConversationIdMock =
  messageRepository.findRecentMessagesByConversationId as jest.MockedFunction<
    typeof messageRepository.findRecentMessagesByConversationId
  >;
const updateMessageMock = messageRepository.updateMessage as jest.MockedFunction<
  typeof messageRepository.updateMessage
>;
const findActiveConversationMock =
  conversationRepository.findActiveConversation as jest.MockedFunction<
    typeof conversationRepository.findActiveConversation
  >;
const insertConversationMock = conversationRepository.insertConversation as jest.MockedFunction<
  typeof conversationRepository.insertConversation
>;
const updateConversationMock = conversationRepository.updateConversation as jest.MockedFunction<
  typeof conversationRepository.updateConversation
>;
const runAgentMock = runAgent as jest.MockedFunction<typeof runAgent>;
const findSingleUserMock = userRepository.findSingleUser as jest.MockedFunction<typeof userRepository.findSingleUser>;
const mockWs = { send: jest.fn() } as unknown as WebSocket;
const enqueueConversationSummaryMock = enqueueConversationSummary as jest.MockedFunction<
  typeof enqueueConversationSummary
>;

const mockUser: userRepository.UserDocument = {
  _id: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const activeConversation: conversationRepository.ConversationDocument = {
  _id: 'conv-1',
  source: 'mobile',
  status: 'active',
  lastSequenceNumber: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  findActiveConversationMock.mockResolvedValue(activeConversation);
  insertConversationMock.mockImplementation(async (doc) => doc);
  insertMessageMock.mockImplementation(async (doc) => doc);
  findRecentMessagesByConversationIdMock.mockResolvedValue([]);
  updateMessageMock.mockResolvedValue(undefined);
  updateConversationMock.mockResolvedValue(undefined);
  findSingleUserMock.mockResolvedValue(mockUser);
  runAgentMock.mockResolvedValue({
    kind: 'text',
    content: 'Paris is the capital of France, Sir.',
  });
  enqueueConversationSummaryMock.mockResolvedValue(undefined);
});

describe('createMessage', () => {
  it('creates a new conversation when none is active', async () => {
    findActiveConversationMock.mockResolvedValue(null);

    await messageService.createMessage('hello', mockWs);

    expect(insertConversationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mobile',
        status: 'active',
        lastSequenceNumber: 0,
      }),
    );
  });

  it('returns a completed text response when the agent returns kind text', async () => {
    const result = await messageService.createMessage('What is the capital of France?', mockWs);

    expect(insertMessageMock).toHaveBeenCalledTimes(2);
    expect(runAgentMock).toHaveBeenCalledWith(
      {
        prompt: 'What is the capital of France?',
        context: [],
        summary: undefined,
        userId: 'user-123',
      },
      mockWs,
      expect.objectContaining({
        conversationId: 'conv-1',
        userMessageId: expect.any(String),
        actionSequenceNumber: 3,
      }),
    );
    expect(findRecentMessagesByConversationIdMock).toHaveBeenCalledWith('conv-1', 10, 1);
    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        type: 'text',
        content: 'Paris is the capital of France, Sir.',
        status: 'completed',
      }),
    );
    expect(updateConversationMock).toHaveBeenCalledWith('conv-1', { lastSequenceNumber: 2 });
    expect(result).toMatchObject({
      conversationId: 'conv-1',
      type: 'text',
      status: 'completed',
      content: 'Paris is the capital of France, Sir.',
    });
    expect(enqueueConversationSummaryMock).toHaveBeenCalledWith(
      'conv-1',
      'What is the capital of France?',
      expect.objectContaining({
        type: 'text',
        status: 'completed',
        content: 'Paris is the capital of France, Sir.',
      }),
    );
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1', created: false }),
      'Conversation resolved',
    );
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1', agentKind: 'text' }),
      'Agent turn completed',
    );
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1', status: 'completed' }),
      'Pipeline completed',
    );
  });

  it('returns a completed text response when the agent returns kind clarify', async () => {
    runAgentMock.mockResolvedValue({
      kind: 'clarify',
      content: 'Could you be more specific, Sir?',
    });

    const result = await messageService.createMessage('do the thing', mockWs);

    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        type: 'text',
        content: 'Could you be more specific, Sir?',
        status: 'completed',
      }),
    );
    expect(updateConversationMock).toHaveBeenCalledWith('conv-1', { lastSequenceNumber: 2 });
    expect(result).toMatchObject({
      type: 'text',
      status: 'completed',
      content: 'Could you be more specific, Sir?',
    });
    expect(enqueueConversationSummaryMock).toHaveBeenCalledWith(
      'conv-1',
      'do the thing',
      expect.objectContaining({
        type: 'text',
        status: 'completed',
        content: 'Could you be more specific, Sir?',
      }),
    );
  });

  it('marks the assistant row failed and rethrows agent errors', async () => {
    runAgentMock.mockRejectedValue(ErrorResponse.LLM_UNAVAILABLE());

    await expect(messageService.createMessage('open camera', mockWs)).rejects.toMatchObject({
      code: 'LLM_UNAVAILABLE',
    });
    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'failed',
        errorDetails: expect.any(String),
      }),
    );
    expect(enqueueConversationSummaryMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineStage: 'pipeline',
        conversationId: 'conv-1',
      }),
      'Message pipeline failed',
    );
  });

  it('records unknown error details when a non-Error is thrown', async () => {
    runAgentMock.mockRejectedValue('boom');

    await expect(messageService.createMessage('open camera', mockWs)).rejects.toBe('boom');
    expect(updateMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'failed',
        errorDetails: 'Unknown error',
      }),
    );
  });

  it('still rethrows when marking the assistant row failed also fails', async () => {
    runAgentMock.mockRejectedValue(ErrorResponse.LLM_UNAVAILABLE());
    updateMessageMock.mockImplementation(async (_id, update) => {
      if (update.status === 'failed') {
        throw new Error('db down');
      }
    });

    await expect(messageService.createMessage('open camera', mockWs)).rejects.toMatchObject({
      code: 'LLM_UNAVAILABLE',
    });
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineStage: 'markFailed',
        conversationId: 'conv-1',
      }),
      'Message pipeline failed',
    );
  });

  it('logs and rethrows when conversation resolution fails', async () => {
    findActiveConversationMock.mockRejectedValue(new Error('db unavailable'));

    await expect(messageService.createMessage('hello', mockWs)).rejects.toThrow('db unavailable');
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineStage: 'conversationResolve',
      }),
      'Message pipeline failed',
    );
    expect(insertMessageMock).not.toHaveBeenCalled();
  });

  it('logs and rethrows when message insert fails after conversation is resolved', async () => {
    insertMessageMock.mockRejectedValueOnce(new Error('insert failed'));

    await expect(messageService.createMessage('hello', mockWs)).rejects.toThrow('insert failed');
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineStage: 'messageInsert',
        conversationId: 'conv-1',
      }),
      'Message pipeline failed',
    );
  });

  it('passes recent messages and conversation summary to the agent', async () => {
    const priorMessage: messageRepository.MessageDocument = {
      _id: 'msg-prior',
      conversationId: 'conv-1',
      type: 'text',
      role: 'user',
      sequenceNumber: 1,
      content: 'Hello',
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    findActiveConversationMock.mockResolvedValue({
      ...activeConversation,
      lastSequenceNumber: 2,
      summary: 'User greeted Jarvis.',
    });
    findRecentMessagesByConversationIdMock.mockResolvedValue([priorMessage]);

    await messageService.createMessage('What did we discuss?', mockWs);

    expect(findRecentMessagesByConversationIdMock).toHaveBeenCalledWith('conv-1', 10, 3);
    expect(runAgentMock).toHaveBeenCalledWith(
      {
        prompt: 'What did we discuss?',
        context: [priorMessage],
        summary: 'User greeted Jarvis.',
        userId: 'user-123',
      },
      mockWs,
      expect.objectContaining({
        conversationId: 'conv-1',
        userMessageId: expect.any(String),
        actionSequenceNumber: 5,
      }),
    );
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        contextMessageCount: 1,
        hasSummary: true,
      }),
      'Agent turn entered',
    );
  });

  it('still returns success when summary enqueue fails', async () => {
    enqueueConversationSummaryMock.mockRejectedValue(new Error('agenda down'));

    const result = await messageService.createMessage('What is the capital of France?', mockWs);

    expect(result.status).toBe('completed');
  });

  it('resolves the user and passes user._id as userId to runAgent', async () => {
    await messageService.createMessage('hello', mockWs);

    expect(findSingleUserMock).toHaveBeenCalledTimes(1);
    expect(runAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123' }),
      mockWs,
      expect.anything(),
    );
  });

  it('passes empty string as userId and still completes when findSingleUser returns null', async () => {
    findSingleUserMock.mockResolvedValue(null);

    const result = await messageService.createMessage('hello', mockWs);

    expect(result.status).toBe('completed');
    expect(runAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '' }),
      mockWs,
      expect.anything(),
    );
  });
});
