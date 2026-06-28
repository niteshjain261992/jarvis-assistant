describe('embedding service', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@/config/env.js', () => ({
      env: {
        OLLAMA_BASE_URL: 'http://localhost:11434',
        EMBEDDING_MODEL: 'nomic-embed-text',
      },
    }));
  });

  it('OllamaEmbeddings instance is configured with env values', () => {
    const MockOllamaEmbeddings = jest.fn().mockImplementation(() => ({
      embedQuery: jest.fn(),
    }));
    jest.doMock('@langchain/ollama', () => ({ OllamaEmbeddings: MockOllamaEmbeddings }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/services/embedding.service.js');

    expect(MockOllamaEmbeddings).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
      }),
    );
  });

  it('embedText delegates to embedQuery and returns the vector', async () => {
    const mockEmbedQuery = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    jest.doMock('@langchain/ollama', () => ({
      OllamaEmbeddings: jest.fn().mockImplementation(() => ({ embedQuery: mockEmbedQuery })),
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { embedText } = require('@/services/embedding.service.js');
    const result = await embedText('hello world');

    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(mockEmbedQuery).toHaveBeenCalledWith('hello world');
  });
});
