jest.mock('@/config/env.js', () => ({
  env: {
    YOUTUBE_API_KEY: 'test-youtube-key',
  },
}));

import { resolveYoutube } from '@/agent/tools/play-music/youtube.platform.js';

const fetchMock = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  fetchMock.mockReset();
});

describe('resolveYoutube', () => {
  it('searches YouTube with music category filters and returns watch URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: { videoId: 'abc123' },
            snippet: { title: 'Bollywood Party Mix' },
          },
        ],
      }),
    });

    const result = await resolveYoutube('Bollywood party songs');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = fetchMock.mock.calls[0][0] as string;
    expect(requestUrl).toContain('https://www.googleapis.com/youtube/v3/search?');
    expect(requestUrl).toContain('part=snippet');
    expect(requestUrl).toContain('type=video');
    expect(requestUrl).toContain('videoCategoryId=10');
    expect(requestUrl).toContain('maxResults=1');
    expect(requestUrl).toContain('q=Bollywood+party+songs');
    expect(requestUrl).toContain('key=test-youtube-key');
    expect(result).toEqual({
      url: 'https://www.youtube.com/watch?v=abc123',
      platform: 'youtube',
      title: 'Bollywood Party Mix',
      id: 'abc123',
    });
  });

  it('throws when no results are returned', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });

    await expect(resolveYoutube('unknown song')).rejects.toThrow(
      'No YouTube results found for query: unknown song',
    );
  });
});

describe('resolveYoutube missing API key', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('throws when YOUTUBE_API_KEY is not configured', async () => {
    jest.doMock('@/config/env.js', () => ({
      env: {},
    }));

    const { resolveYoutube: resolveWithoutKey } = await import(
      '@/agent/tools/play-music/youtube.platform.js'
    );

    await expect(resolveWithoutKey('query')).rejects.toThrow('YOUTUBE_API_KEY is not configured');
  });
});
