import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '@/config/env.js';
import { logger } from '@/utils/logger.js';

export const EMBEDDING_DIMENSIONS = 768;
export const COLLECTION_NAME = 'user_context';

let _client: QdrantClient | undefined;

export function getQdrantClient(): QdrantClient {
  if (!_client) {
    _client = new QdrantClient({ url: env.QDRANT_URL });
  }
  return _client;
}

export async function ensureCollection(): Promise<void> {
  const client = getQdrantClient();
  const { exists } = await client.collectionExists(COLLECTION_NAME);
  if (exists) {
    logger.info({ collection: COLLECTION_NAME }, 'Qdrant collection already exists');
    return;
  }
  await client.createCollection(COLLECTION_NAME, {
    vectors: { size: EMBEDDING_DIMENSIONS, distance: 'Cosine' },
  });
  logger.info({ collection: COLLECTION_NAME }, 'Qdrant collection created');
}

// The @qdrant/js-client-rest client is a stateless REST wrapper with no
// persistent socket connection, so no teardown function is needed.
