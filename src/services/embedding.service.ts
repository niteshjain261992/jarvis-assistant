import { OllamaEmbeddings } from '@langchain/ollama';
import { env } from '@/config/env.js';

export const embeddings = new OllamaEmbeddings({
  model: env.EMBEDDING_MODEL,
  baseUrl: env.OLLAMA_BASE_URL,
});

export async function embedText(text: string): Promise<number[]> {
  return embeddings.embedQuery(text);
}
