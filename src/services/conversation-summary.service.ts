import { getAgenda } from '@/config/agenda.js';
import * as conversationRepository from '@/repositories/conversation.repository.js';
import { summarizeText } from '@/services/ollama.service.js';
import { logger } from '@/utils/logger.js';

export const SUMMARY_JOB_NAME = 'update-conversation-summary';

interface CompletedExchangeResult {
  status: 'completed' | 'failed';
  type: 'text' | 'action';
  content?: string;
  actionName?: string;
  actionPayload?: Record<string, unknown>;
  actionResult?: Record<string, unknown>;
}

export interface UpdateConversationSummaryJobData {
  conversationId: string;
  exchangeText: string;
}

export function buildExchangeText(userPrompt: string, assistantText: string): string {
  return `user: ${userPrompt}\nassistant: ${assistantText}`;
}

export function formatAssistantText(result: CompletedExchangeResult): string {
  if (result.status !== 'completed') {
    return '';
  }

  if (result.type === 'text' && result.content) {
    return result.content;
  }

  if (result.type === 'action') {
    const parts: string[] = [];
    if (result.actionName) {
      parts.push(result.actionName);
    }
    if (result.actionPayload) {
      parts.push(JSON.stringify(result.actionPayload));
    }
    if (result.actionResult) {
      parts.push(JSON.stringify(result.actionResult));
    }
    return parts.join(' ');
  }

  return '';
}

export async function processSummaryJob(data: UpdateConversationSummaryJobData): Promise<void> {
  const conversation = await conversationRepository.findConversationById(data.conversationId);

  if (!conversation) {
    logger.warn({ conversationId: data.conversationId }, 'Conversation not found for summary job');
    return;
  }

  const input = conversation.summary
    ? `Previous summary:\n${conversation.summary}\n\nNew exchange:\n${data.exchangeText}`
    : data.exchangeText;

  try {
    const newSummary = await summarizeText(input);
    await conversationRepository.updateConversation(data.conversationId, { summary: newSummary });
    logger.debug(
      {
        conversationId: data.conversationId,
        summaryJob: 'persisted',
        rolling: Boolean(conversation.summary),
      },
      'Conversation summary updated',
    );
  } catch (err) {
    logger.error({ err, conversationId: data.conversationId }, 'Failed to update conversation summary');
  }
}

export async function enqueueConversationSummary(
  conversationId: string,
  userPrompt: string,
  result: CompletedExchangeResult,
): Promise<void> {
  if (result.status !== 'completed') {
    return;
  }

  const assistantText = formatAssistantText(result);
  if (!assistantText) {
    return;
  }

  const agenda = getAgenda();
  if (!agenda) {
    logger.warn({ conversationId }, 'Agenda not started; skipping summary enqueue');
    return;
  }

  await agenda.now(SUMMARY_JOB_NAME, {
    conversationId,
    exchangeText: buildExchangeText(userPrompt, assistantText),
  } satisfies UpdateConversationSummaryJobData);
  logger.debug({ conversationId, summaryJob: 'enqueued' }, 'Summary job enqueued');
}
