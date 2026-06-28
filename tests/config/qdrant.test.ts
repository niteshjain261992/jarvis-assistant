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

describe('qdrant config', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@/config/env.js', () => ({
      env: { QDRANT_URL: 'http://localhost:6333' },
    }));
    jest.doMock('@/utils/logger.js', () => ({
      logger: {
        fatal: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      },
    }));
  });

  it('creates the collection when absent', async () => {
    const mockCollectionExists = jest.fn().mockResolvedValue({ exists: false });
    const mockCreateCollection = jest.fn().mockResolvedValue({});
    jest.doMock('@qdrant/js-client-rest', () => ({
      QdrantClient: jest.fn().mockImplementation(() => ({
        collectionExists: mockCollectionExists,
        createCollection: mockCreateCollection,
      })),
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ensureCollection } = require('@/config/qdrant.js');
    await ensureCollection();

    expect(mockCollectionExists).toHaveBeenCalledWith('user_context');
    expect(mockCreateCollection).toHaveBeenCalledWith('user_context', {
      vectors: { size: 768, distance: 'Cosine' },
    });
  });

  it('is idempotent when collection already exists', async () => {
    const mockCollectionExists = jest.fn().mockResolvedValue({ exists: true });
    const mockCreateCollection = jest.fn();
    jest.doMock('@qdrant/js-client-rest', () => ({
      QdrantClient: jest.fn().mockImplementation(() => ({
        collectionExists: mockCollectionExists,
        createCollection: mockCreateCollection,
      })),
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ensureCollection } = require('@/config/qdrant.js');
    await ensureCollection();

    expect(mockCollectionExists).toHaveBeenCalled();
    expect(mockCreateCollection).not.toHaveBeenCalled();
  });

  it('returns the same client instance on repeated calls', () => {
    jest.doMock('@qdrant/js-client-rest', () => ({
      QdrantClient: jest.fn().mockImplementation(() => ({})),
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getQdrantClient } = require('@/config/qdrant.js');
    const c1 = getQdrantClient();
    const c2 = getQdrantClient();
    expect(c1).toBe(c2);
  });
});
