import { createHash } from 'node:crypto';
import { COLLECTION_NAME, getQdrantClient } from '@/config/qdrant.js';
import type { UserDocument } from '@/models/user.model.js';
import { embedText } from '@/services/embedding.service.js';
import { logger } from '@/utils/logger.js';

// Stable DNS namespace UUID (RFC 4122) used for deterministic UUIDv5 derivation.
// Must never change — altering it orphans existing Qdrant points.
const NAMESPACE_HEX = '6ba7b8109dad11d180b400c04fd430c8';

function deterministicPointId(logicalId: string): string {
  const nsBytes = Buffer.from(NAMESPACE_HEX, 'hex');
  const nameBytes = Buffer.from(logicalId, 'utf8');
  const hash = createHash('sha1').update(nsBytes).update(nameBytes).digest();
  // RFC 4122 §4.3: set version to 5 and variant to 0b10xx
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const h = hash.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function buildIdentitySentence(user: UserDocument): string {
  const parts: string[] = [];
  if (user.name) parts.push(`Name: ${user.name}`);
  if (user.dob) parts.push(`Date of birth: ${user.dob}`);
  if (user.homeLocation) parts.push(`Home location: ${user.homeLocation}`);
  return parts.length > 0 ? parts.join('. ') + '.' : 'No identity information available.';
}

function buildLocationSentence(user: UserDocument): string {
  if (user.currentLocationName) {
    return `User's current location is ${user.currentLocationName}.`;
  }
  return `User's current location is latitude ${user.currentLat}, longitude ${user.currentLon}.`;
}

export async function upsertUserIdentity(user: UserDocument): Promise<void> {
  try {
    const logicalId = `${user._id}:identity`;
    const pointId = deterministicPointId(logicalId);
    const sentence = buildIdentitySentence(user);
    const vector = await embedText(sentence);
    await getQdrantClient().upsert(COLLECTION_NAME, {
      points: [{ id: pointId, vector, payload: { userId: user._id, type: 'identity', logicalId, text: sentence } }],
    });
    logger.info({ userId: user._id, pointId }, 'Upserted identity embedding');
  } catch (err) {
    logger.error({ err, userId: user._id }, 'Failed to upsert identity embedding');
  }
}

export async function upsertUserLocation(user: UserDocument): Promise<void> {
  if (!user.currentLocationName && (user.currentLat === undefined || user.currentLon === undefined)) {
    return;
  }
  try {
    const logicalId = `${user._id}:location`;
    const pointId = deterministicPointId(logicalId);
    const sentence = buildLocationSentence(user);
    const vector = await embedText(sentence);
    await getQdrantClient().upsert(COLLECTION_NAME, {
      points: [{ id: pointId, vector, payload: { userId: user._id, type: 'location', logicalId, text: sentence } }],
    });
    logger.info({ userId: user._id, pointId }, 'Upserted location embedding');
  } catch (err) {
    logger.error({ err, userId: user._id }, 'Failed to upsert location embedding');
  }
}

export async function retrieveUserContext(prompt: string, userId: string): Promise<string> {
  if (!userId) {
    return '';
  }
  try {
    const vector = await embedText(prompt);
    const results = await getQdrantClient().search(COLLECTION_NAME, {
      vector,
      limit: 3,
      filter: { must: [{ key: 'userId', match: { value: userId } }] },
      with_payload: true,
    });
    const texts = results
      .map((r) => (r.payload as Record<string, unknown>)?.text)
      .filter((t): t is string => typeof t === 'string' && t.length > 0);
    return texts.join('\n');
  } catch (err) {
    logger.error({ err, userId }, 'Failed to retrieve user context');
    return '';
  }
}
