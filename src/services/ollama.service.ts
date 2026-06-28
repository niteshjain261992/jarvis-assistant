import { env } from '@/config/env.js';
import type { MessageDocument } from '@/models/message.model.js';
import { ErrorResponse } from '@/utils/api-response.js';
import { logger } from '@/utils/logger.js';

const SUMMARY_TIMEOUT_MS = 15_000;

const SUMMARY_SYSTEM_PROMPT = [
  'You summarize Jarvis conversation exchanges into a concise rolling summary.',
  'Preserve key facts, commands, and outcomes in third person.',
  'Keep the summary under 200 words.',
  'Respond with only the summary text.',
].join(' ');

type LlmOperation = 'summarizeText';

interface OllamaGenerateResponse {
  response?: string;
}

function stripSurroundingQuotes(raw: string): string {
  return raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

async function callOllama(
  llmOperation: LlmOperation,
  system: string,
  prompt: string,
  timeoutMs: number,
  temperature: number,
): Promise<string> {
  const startedAt = Date.now();
  logger.debug({ llmOperation }, 'LLM call started');

  let res: Response;
  try {
    res = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        system,
        prompt,
        stream: false,
        options: { temperature },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw ErrorResponse.LLM_UNAVAILABLE();
  }

  if (!res.ok) {
    throw ErrorResponse.LLM_ERROR_RESPONSE(res.status);
  }

  const data = (await res.json()) as OllamaGenerateResponse;
  logger.debug({ llmOperation, durationMs: Date.now() - startedAt }, 'LLM call completed');
  return data.response ?? '';
}

export function filterCompletedContextMessages(context: MessageDocument[]): MessageDocument[] {
  return context.filter((message) => message.content && message.status === 'completed');
}

export async function summarizeText(input: string): Promise<string> {
  const text = stripSurroundingQuotes(
    await callOllama('summarizeText', SUMMARY_SYSTEM_PROMPT, input, SUMMARY_TIMEOUT_MS, 0.2),
  );

  if (text.length === 0) {
    throw ErrorResponse.LLM_EMPTY_RESPONSE();
  }

  return text;
}
