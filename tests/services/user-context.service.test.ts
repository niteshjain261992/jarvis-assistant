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

jest.mock('@/config/qdrant.js', () => ({
  COLLECTION_NAME: 'user_context',
  getQdrantClient: jest.fn(),
}));

jest.mock('@/services/embedding.service.js', () => ({
  embedText: jest.fn(),
}));

import { getQdrantClient } from '@/config/qdrant.js';
import { embedText } from '@/services/embedding.service.js';
import type { UserDocument } from '@/models/user.model.js';
import { upsertUserIdentity, upsertUserLocation, retrieveUserContext } from '@/services/user-context.service.js';
import { logger } from '@/utils/logger.js';

const getQdrantClientMock = getQdrantClient as jest.Mock;
const embedTextMock = embedText as jest.MockedFunction<typeof embedText>;
const loggerErrorMock = logger.error as jest.MockedFunction<typeof logger.error>;

const NOW = new Date('2026-01-01T00:00:00.000Z');

function makeUser(overrides: Partial<UserDocument> = {}): UserDocument {
  return {
    _id: 'user-123',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

let mockUpsert: jest.Mock;
let mockSearch: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUpsert = jest.fn().mockResolvedValue({});
  mockSearch = jest.fn().mockResolvedValue([]);
  getQdrantClientMock.mockReturnValue({ upsert: mockUpsert, search: mockSearch });
  embedTextMock.mockResolvedValue([0.1, 0.2, 0.3]);
});

describe('upsertUserIdentity', () => {
  it('builds the correct identity sentence and upserts at the identity point id', async () => {
    const user = makeUser({ name: 'Alice', homeLocation: 'Mumbai' });
    await upsertUserIdentity(user);

    expect(embedTextMock).toHaveBeenCalledWith(expect.stringContaining('Alice'));
    expect(embedTextMock).toHaveBeenCalledWith(expect.stringContaining('Mumbai'));
    expect(mockUpsert).toHaveBeenCalledWith(
      'user_context',
      expect.objectContaining({
        points: [
          expect.objectContaining({
            payload: expect.objectContaining({ userId: 'user-123', type: 'identity' }),
          }),
        ],
      }),
    );
  });

  it('includes payload.text equal to the embedded sentence', async () => {
    const user = makeUser({ name: 'Alice', homeLocation: 'Mumbai' });
    await upsertUserIdentity(user);

    const upsertPayload = (mockUpsert.mock.calls[0] as [string, { points: [{ payload: Record<string, unknown> }] }])[1].points[0]!.payload;
    expect(typeof upsertPayload['text']).toBe('string');
    expect(upsertPayload['text']).toContain('Alice');
  });

  it('skips undefined fields — sentence never contains the word "undefined"', async () => {
    const user = makeUser({ name: 'Alice' }); // no dob, no homeLocation
    await upsertUserIdentity(user);

    const sentence: string = embedTextMock.mock.calls[0]![0] as string;
    expect(sentence).not.toContain('undefined');
    expect(sentence).toContain('Alice');
  });

  it('uses the same point id on repeated calls (overwrite semantics)', async () => {
    const user = makeUser({ name: 'Alice' });
    await upsertUserIdentity(user);
    await upsertUserIdentity(user);

    const id1: string = (mockUpsert.mock.calls[0] as [string, { points: [{ id: string }] }])[1]
      .points[0]!.id;
    const id2: string = (mockUpsert.mock.calls[1] as [string, { points: [{ id: string }] }])[1]
      .points[0]!.id;
    expect(id1).toBe(id2);
  });

  it('is non-fatal when the embedder throws', async () => {
    embedTextMock.mockRejectedValue(new Error('network error'));
    const user = makeUser({ name: 'Alice' });

    await expect(upsertUserIdentity(user)).resolves.toBeUndefined();
    expect(loggerErrorMock).toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('is non-fatal when upsert throws', async () => {
    mockUpsert.mockRejectedValue(new Error('Qdrant down'));
    const user = makeUser({ name: 'Alice' });

    await expect(upsertUserIdentity(user)).resolves.toBeUndefined();
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});

describe('upsertUserLocation', () => {
  it('embeds the readable place name when currentLocationName is present', async () => {
    const user = makeUser({
      currentLat: 28.4595,
      currentLon: 77.0266,
      currentLocationName: 'Bandra West, Mumbai, Maharashtra',
    });
    await upsertUserLocation(user);

    const sentence: string = embedTextMock.mock.calls[0]![0] as string;
    expect(sentence).toContain('Bandra West, Mumbai, Maharashtra');
    expect(sentence).not.toContain('28.4595');
    expect(sentence).not.toContain('77.0266');
  });

  it('falls back to coordinates when currentLocationName is absent but lat/lon present', async () => {
    const user = makeUser({ currentLat: 28.4595, currentLon: 77.0266 });
    await upsertUserLocation(user);

    const sentence: string = embedTextMock.mock.calls[0]![0] as string;
    expect(sentence).toContain('28.4595');
    expect(sentence).toContain('77.0266');
  });

  it('upserts at the location point id when lat/lon are present', async () => {
    const user = makeUser({ currentLat: 28.4595, currentLon: 77.0266 });
    await upsertUserLocation(user);

    expect(mockUpsert).toHaveBeenCalledWith(
      'user_context',
      expect.objectContaining({
        points: [
          expect.objectContaining({
            payload: expect.objectContaining({ userId: 'user-123', type: 'location' }),
          }),
        ],
      }),
    );
  });

  it('includes payload.text equal to the embedded sentence', async () => {
    const user = makeUser({ currentLat: 28.4595, currentLon: 77.0266, currentLocationName: 'Bandra West' });
    await upsertUserLocation(user);

    const upsertPayload = (mockUpsert.mock.calls[0] as [string, { points: [{ payload: Record<string, unknown> }] }])[1].points[0]!.payload;
    expect(typeof upsertPayload['text']).toBe('string');
    expect(upsertPayload['text']).toContain('Bandra West');
  });

  it('does nothing (no upsert) when neither name nor lat/lon are present', async () => {
    const user = makeUser({ currentLat: undefined, currentLon: undefined });
    await upsertUserLocation(user);

    expect(embedTextMock).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('does nothing when only one coordinate is present and no name', async () => {
    const user = makeUser({ currentLat: 28.4595, currentLon: undefined });
    await upsertUserLocation(user);

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('uses the same point id on repeated calls — name case (overwrite semantics)', async () => {
    const user = makeUser({
      currentLat: 28.4595,
      currentLon: 77.0266,
      currentLocationName: 'Bandra West, Mumbai, Maharashtra',
    });
    await upsertUserLocation(user);

    const userUpdated = makeUser({ currentLat: 28.5, currentLon: 77.1 });
    await upsertUserLocation(userUpdated);

    const id1: string = (mockUpsert.mock.calls[0] as [string, { points: [{ id: string }] }])[1]
      .points[0]!.id;
    const id2: string = (mockUpsert.mock.calls[1] as [string, { points: [{ id: string }] }])[1]
      .points[0]!.id;
    expect(id1).toBe(id2);
  });

  it('uses the same point id on repeated calls — coordinates case (overwrite semantics)', async () => {
    const user = makeUser({ currentLat: 28.4595, currentLon: 77.0266 });
    await upsertUserLocation(user);

    const userUpdated = makeUser({ currentLat: 28.5, currentLon: 77.1 });
    await upsertUserLocation(userUpdated);

    const id1: string = (mockUpsert.mock.calls[0] as [string, { points: [{ id: string }] }])[1]
      .points[0]!.id;
    const id2: string = (mockUpsert.mock.calls[1] as [string, { points: [{ id: string }] }])[1]
      .points[0]!.id;
    expect(id1).toBe(id2);
  });

  it('is non-fatal when the embedder throws', async () => {
    embedTextMock.mockRejectedValue(new Error('Qdrant down'));
    const user = makeUser({ currentLat: 28.4595, currentLon: 77.0266 });

    await expect(upsertUserLocation(user)).resolves.toBeUndefined();
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});

describe('retrieveUserContext', () => {
  it('returns empty string for empty userId WITHOUT calling embedText or search', async () => {
    const result = await retrieveUserContext('where am I?', '');

    expect(embedTextMock).not.toHaveBeenCalled();
    expect(mockSearch).not.toHaveBeenCalled();
    expect(result).toBe('');
  });

  it('returns empty string for falsy userId without embedding or searching', async () => {
    const result = await retrieveUserContext('what is my name?', '   '.trim());

    expect(embedTextMock).not.toHaveBeenCalled();
    expect(mockSearch).not.toHaveBeenCalled();
    expect(result).toBe('');
  });

  it('embeds the prompt and calls search with a mandatory userId filter', async () => {
    mockSearch.mockResolvedValue([]);
    await retrieveUserContext('where am I?', 'user-123');

    expect(embedTextMock).toHaveBeenCalledWith('where am I?');
    expect(mockSearch).toHaveBeenCalledWith(
      'user_context',
      expect.objectContaining({
        limit: 3,
        with_payload: true,
        filter: expect.objectContaining({
          must: expect.arrayContaining([
            expect.objectContaining({ key: 'userId', match: { value: 'user-123' } }),
          ]),
        }),
      }),
    );
  });

  it('joins multiple result payload.text values with newlines', async () => {
    mockSearch.mockResolvedValue([
      { payload: { text: 'Name: Alice.', userId: 'user-123', type: 'identity' } },
      { payload: { text: "User's current location is Mumbai.", userId: 'user-123', type: 'location' } },
    ]);

    const result = await retrieveUserContext('who am I?', 'user-123');

    expect(result).toBe("Name: Alice.\nUser's current location is Mumbai.");
  });

  it('returns empty string when there are zero matches', async () => {
    mockSearch.mockResolvedValue([]);

    const result = await retrieveUserContext('hello', 'user-123');

    expect(result).toBe('');
  });

  it('returns empty string (not throw) when embedText throws', async () => {
    embedTextMock.mockRejectedValue(new Error('embedding failed'));

    await expect(retrieveUserContext('hello', 'user-123')).resolves.toBe('');
    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('returns empty string (not throw) when search throws', async () => {
    mockSearch.mockRejectedValue(new Error('Qdrant down'));

    await expect(retrieveUserContext('hello', 'user-123')).resolves.toBe('');
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
