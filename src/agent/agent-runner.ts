import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { ChatOllama } from '@langchain/ollama';
import { createAgent } from 'langchain';
import type { WebSocket } from 'ws';

import { buildToolsForConnection } from '@/agent/tools/index.js';
import type { ClientTaskPersistenceContext } from '@/agent/tools/index.js';
import { env } from '@/config/env.js';
import type { MessageDocument } from '@/models/message.model.js';
import { filterCompletedContextMessages } from '@/services/ollama.service.js';
import { retrieveUserContext } from '@/services/user-context.service.js';
import { logger } from '@/utils/logger.js';

export type AgentRunResult =
  | { kind: 'text'; content: string }
  | { kind: 'clarify'; content: string };

export const CLARIFY_FALLBACK = "I couldn't process that. Could you rephrase?";

export const CONVERSATION_SYSTEM_PROMPT = [
  'You are Jarvis, a highly intelligent, witty, slightly sarcastic, and deeply loyal AI assistant.',
  'Answer the user naturally. Address them as "Sir" when appropriate.',
].join(' ');

const TOOL_USE_POLICY = [
  'Most user requests are conversational — reply with a direct text answer and do not call any tool.',
  'Only call a tool when the request clearly matches one of the available tool descriptions.',
  'When you are unsure, prefer answering with text rather than guessing a tool.',
].join(' ');

export async function buildAgentSystemPrompt(userContext: string, summary?: string): Promise<string> {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const parts = [
    CONVERSATION_SYSTEM_PROMPT,
    TOOL_USE_POLICY,
    `Current date and time: ${now} (IST, Asia/Kolkata)`,
  ];

  if (userContext) {
    parts.push(`Known information about the user:\n${userContext}`);
  }

  const trimmedSummary = summary?.trim();
  if (trimmedSummary) {
    parts.push(`Previous conversation summary:\n${trimmedSummary}`);
  }

  return parts.join('\n\n');
}

export function buildAgentMessages(context: MessageDocument[], prompt: string): BaseMessage[] {
  const messages = filterCompletedContextMessages(context).map((message) => {
    if (message.role === 'assistant') {
      return new AIMessage(message.content!);
    }

    return new HumanMessage(message.content!);
  });

  return [...messages, new HumanMessage(prompt)];
}

function extractTextContent(message: AIMessage): string {
  if (typeof message.content === 'string') {
    return message.content.trim();
  }

  return message.content
    .map((part) => (typeof part === 'string' ? part : 'text' in part ? part.text : ''))
    .join('')
    .trim();
}

export async function resolveAgentRunResult(messages: BaseMessage[]): Promise<AgentRunResult> {
  const lastMessage = messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return { kind: 'clarify', content: CLARIFY_FALLBACK };
  }

  const content = extractTextContent(lastMessage);

  if (!content) {
    return { kind: 'clarify', content: CLARIFY_FALLBACK };
  }

  return { kind: 'text', content };
}

export async function runAgent(
  input: {
    prompt: string;
    context: MessageDocument[];
    summary?: string;
    userId: string;
  },
  ws: WebSocket,
  context?: ClientTaskPersistenceContext,
): Promise<AgentRunResult> {
  let userContext = '';
  try {
    userContext = await retrieveUserContext(input.prompt, input.userId);
  } catch (err) {
    logger.error({ err }, 'retrieveUserContext threw unexpectedly');
    userContext = '';
  }

  const systemPrompt = await buildAgentSystemPrompt(userContext, input.summary);

  const model = new ChatOllama({
    baseUrl: env.OLLAMA_BASE_URL.toString(),
    model: env.OLLAMA_MODEL,
    temperature: 0,
  });

  const agent = createAgent({
    model,
    tools: buildToolsForConnection(ws, context).map((definition) => definition.tool),
    systemPrompt,
  });

  const messages = buildAgentMessages(input.context, input.prompt);

  try {
    const result = await agent.invoke({ messages }, { recursionLimit: 5 });
    return await resolveAgentRunResult(result.messages);
  } catch {
    return { kind: 'clarify', content: CLARIFY_FALLBACK };
  }
}
