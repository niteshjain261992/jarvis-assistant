import { randomUUID } from 'node:crypto';

import { isJarvisError } from '@/errors/index.js';
import * as messageRepository from '@/repositories/message.repository.js';
import { logger } from '@/utils/logger.js';

export interface ClientTaskPersistenceContext {
  conversationId: string;
  userMessageId: string;
  actionSequenceNumber: number;
}

async function insertPendingToolAction(
  messageId: string,
  context: ClientTaskPersistenceContext,
  actionName: string,
  actionPayload: Record<string, unknown>,
  executor: 'client' | 'server',
): Promise<void> {
  const now = new Date();
  try {
    await messageRepository.insertMessage({
      _id: messageId,
      conversationId: context.conversationId,
      parentId: context.userMessageId,
      type: 'action',
      role: 'assistant',
      sequenceNumber: context.actionSequenceNumber,
      status: 'pending',
      actionName,
      actionExecutor: executor,
      actionPayload,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    logger.error({ err, messageId, actionName }, 'Failed to insert pending tool action');
  }
}

function normalizeActionResult(result: unknown): Record<string, unknown> {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }

  return { value: result };
}

async function completePendingToolAction(messageId: string, result: unknown): Promise<void> {
  try {
    await messageRepository.updateMessage(messageId, {
      status: 'completed',
      actionResult: normalizeActionResult(result),
    });
  } catch (err) {
    logger.error({ err, messageId }, 'Failed to complete tool action');
  }
}

async function failPendingToolAction(messageId: string, errorDetails: string): Promise<void> {
  try {
    await messageRepository.updateMessage(messageId, {
      status: 'failed',
      errorDetails,
    });
  } catch (err) {
    logger.error({ err, messageId, errorDetails }, 'Failed to mark tool action as failed');
  }
}

export async function withToolPersistence<T>(
  context: ClientTaskPersistenceContext,
  actionName: string,
  actionPayload: Record<string, unknown>,
  executor: 'client' | 'server',
  execute: () => Promise<T>,
): Promise<T> {
  const messageId = randomUUID();
  await insertPendingToolAction(messageId, context, actionName, actionPayload, executor);
  try {
    const result = await execute();
    await completePendingToolAction(messageId, result);
    return result;
  } catch (err) {
    const errorDetails = isJarvisError(err)
      ? err.message
      : err instanceof Error
        ? err.message
        : 'Unknown error';
    await failPendingToolAction(messageId, errorDetails);
    throw err;
  }
}
