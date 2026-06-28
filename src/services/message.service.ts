import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { runAgent } from '@/agent/agent-runner.js';
import { env } from '@/config/env.js';
import type { MessageActionExecutor } from '@/models/message.model.js';
import * as conversationRepository from '@/repositories/conversation.repository.js';
import * as messageRepository from '@/repositories/message.repository.js';
import { findSingleUser } from '@/repositories/user.repository.js';
import { enqueueConversationSummary } from '@/services/conversation-summary.service.js';
import { logger } from '@/utils/logger.js';

type PipelineStage = 'conversationResolve' | 'messageInsert' | 'pipeline' | 'markFailed';

interface PipelineLogContext {
  conversationId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  errorDetails?: string;
}

interface PipelineContext {
  prompt: string;
  conversation: conversationRepository.ConversationDocument;
  userMessageId: string;
  assistantMessageId: string;
  userSequence: number;
  assistantSequence: number;
}

function logPipelineFailure(
  err: unknown,
  pipelineStage: PipelineStage,
  ctx: PipelineLogContext,
): void {
  logger.error({ err, pipelineStage, ...ctx }, 'Message pipeline failed');
}

function pipelineLogContext(ctx: PipelineContext): PipelineLogContext {
  return {
    conversationId: ctx.conversation._id,
    userMessageId: ctx.userMessageId,
    assistantMessageId: ctx.assistantMessageId,
  };
}

export interface CreateMessageResult {
  conversationId: string;
  type: 'text' | 'action';
  status: 'completed' | 'failed';
  content?: string;
  actionName?: string;
  actionExecutor?: MessageActionExecutor;
  actionPayload?: Record<string, unknown>;
  actionResult?: Record<string, unknown>;
  model?: string;
  errorDetails?: string;
}

async function getOrCreateActiveConversation(
  source: conversationRepository.ConversationSource,
): Promise<{ conversation: conversationRepository.ConversationDocument; created: boolean }> {
  const existing = await conversationRepository.findActiveConversation(source);

  if (existing) {
    return { conversation: existing, created: false };
  }

  const now = new Date();
  const conversation = await conversationRepository.insertConversation({
    _id: randomUUID(),
    source,
    status: 'active',
    lastSequenceNumber: 0,
    createdAt: now,
    updatedAt: now,
  });

  return { conversation, created: true };
}

function scheduleConversationSummary(
  conversationId: string,
  prompt: string,
  result: CreateMessageResult,
): void {
  void enqueueConversationSummary(conversationId, prompt, result).catch((err) => {
    logger.error({ err, conversationId }, 'Failed to enqueue conversation summary job');
  });
}

async function markAssistantFailed(ctx: PipelineContext, err: unknown): Promise<void> {
  const errorDetails = err instanceof Error ? err.message : 'Unknown error';
  await messageRepository.updateMessage(ctx.assistantMessageId, {
    status: 'failed',
    errorDetails,
  });
}

async function preparePipelineContext(prompt: string): Promise<PipelineContext> {
  const userMessageId = randomUUID();
  const assistantMessageId = randomUUID();

  let conversation: conversationRepository.ConversationDocument | undefined;
  let userSequence: number;
  let assistantSequence: number;

  try {
    const resolved = await getOrCreateActiveConversation('mobile'); // this need to be based on the source of the request
    conversation = resolved.conversation;
    logger.debug(
      { conversationId: conversation._id, created: resolved.created },
      'Conversation resolved',
    );

    userSequence = conversation.lastSequenceNumber + 1;
    assistantSequence = userSequence + 1;
    const now = new Date();

    await messageRepository.insertMessage({
      _id: userMessageId,
      conversationId: conversation._id,
      type: 'text',
      role: 'user',
      sequenceNumber: userSequence,
      content: prompt,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    });

    await messageRepository.insertMessage({
      _id: assistantMessageId,
      conversationId: conversation._id,
      parentId: userMessageId,
      type: 'text',
      role: 'assistant',
      sequenceNumber: assistantSequence,
      status: 'processing',
      createdAt: now,
      updatedAt: now,
    });
    logger.debug(
      { conversationId: conversation._id, userMessageId, assistantMessageId },
      'Messages persisted',
    );
  } catch (err) {
    logPipelineFailure(err, conversation ? 'messageInsert' : 'conversationResolve', {
      conversationId: conversation?._id,
      userMessageId,
      assistantMessageId,
    });
    throw err;
  }

  return {
    prompt,
    conversation,
    userMessageId,
    assistantMessageId,
    userSequence,
    assistantSequence,
  };
}

async function withPipelineErrorRecovery(
  ctx: PipelineContext,
  fn: () => Promise<CreateMessageResult>,
): Promise<CreateMessageResult> {
  try {
    return await fn();
  } catch (err) {
    logPipelineFailure(err, 'pipeline', pipelineLogContext(ctx));
    await markAssistantFailed(ctx, err).catch((markErr) => {
      logPipelineFailure(markErr, 'markFailed', pipelineLogContext(ctx));
    });
    throw err;
  }
}

async function runAgentTurn(ctx: PipelineContext, ws: WebSocket): Promise<CreateMessageResult> {
  const {
    conversation,
    prompt,
    userSequence,
    userMessageId,
    assistantSequence,
    assistantMessageId,
  } = ctx;
  const actionSequenceNumber = assistantSequence + 1;

  const user = await findSingleUser();

  const recentMessages = await messageRepository.findRecentMessagesByConversationId(
    conversation._id,
    10,
    userSequence,
  );
  logger.debug(
    {
      conversationId: conversation._id,
      contextMessageCount: recentMessages.length,
      hasSummary: Boolean(conversation.summary?.trim()),
    },
    'Agent turn entered',
  );

  const agentResult = await runAgent(
    {
      prompt,
      context: recentMessages,
      summary: conversation.summary,
      userId: user?._id ?? '',
    },
    ws,
    {
      conversationId: conversation._id,
      userMessageId,
      actionSequenceNumber,
    },
  );

  logger.debug(
    { conversationId: conversation._id, agentKind: agentResult.kind },
    'Agent turn completed',
  );

  const content = agentResult.content;
  await messageRepository.updateMessage(assistantMessageId, {
    type: 'text',
    content,
    status: 'completed',
    model: env.OLLAMA_MODEL,
  });
  await conversationRepository.updateConversation(conversation._id, {
    lastSequenceNumber: assistantSequence,
  });

  const result: CreateMessageResult = {
    conversationId: conversation._id,
    type: 'text',
    status: 'completed',
    content,
    model: env.OLLAMA_MODEL,
  };
  scheduleConversationSummary(conversation._id, prompt, result);
  logger.debug(
    { conversationId: conversation._id, type: result.type, status: result.status },
    'Pipeline completed',
  );
  return result;
}

export async function createMessage(prompt: string, ws: WebSocket): Promise<CreateMessageResult> {
  const ctx = await preparePipelineContext(prompt);

  return withPipelineErrorRecovery(ctx, () => runAgentTurn(ctx, ws));
}
