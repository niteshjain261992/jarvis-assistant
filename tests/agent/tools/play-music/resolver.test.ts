jest.mock('@/config/env.js', () => ({
  env: {
    YOUTUBE_API_KEY: 'test-youtube-key',
    SPOTIFY_CLIENT_ID: 'test-client-id',
    SPOTIFY_CLIENT_SECRET: 'test-client-secret',
  },
}));

import { resolvePlayMusicUrl } from '@/agent/tools/play-music/resolver.js';

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

describe('resolvePlayMusicUrl', () => {
  it('resolves YouTube URLs for youtube platform', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: { videoId: 'vid1' }, snippet: { title: 'Party Song' } }],
      }),
    });

    const result = await resolvePlayMusicUrl('party songs', 'youtube');

    expect(result.url).toBe('https://www.youtube.com/watch?v=vid1');
    expect(result.platform).toBe('youtube');
  });

  it('resolves Spotify deeplinks for spotify platform', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracks: { items: [{ id: 'trk1', name: 'Track One' }] },
        }),
      });

    const result = await resolvePlayMusicUrl('track one', 'spotify');

    expect(result.url).toBe('spotify:track:trk1');
    expect(result.platform).toBe('spotify');
  });

  it('normalizes platform aliases before dispatching', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: { videoId: 'vid2' }, snippet: { title: 'Song' } }],
      }),
    });

    const result = await resolvePlayMusicUrl('song', 'You Tube');

    expect(result.id).toBe('vid2');
  });

  it('throws for unsupported platforms', async () => {
    await expect(resolvePlayMusicUrl('query', 'gaana')).rejects.toThrow(
      'Platform "gaana" is not supported',
    );
  });

  it('throws for stub platforms that are not fully implemented', async () => {
    await expect(resolvePlayMusicUrl('query', 'apple_music')).rejects.toThrow(
      'Platform "apple_music" is not supported yet',
    );
  });

  it('throws when YouTube API key is missing', async () => {
    jest.resetModules();
    jest.doMock('@/config/env.js', () => ({
      env: {},
    }));

    const { resolvePlayMusicUrl: resolveWithoutKey } = await import(
      '@/agent/tools/play-music/resolver.js'
    );

    await expect(resolveWithoutKey('query', 'youtube')).rejects.toThrow(
      'YOUTUBE_API_KEY is not configured',
    );
  });
});
