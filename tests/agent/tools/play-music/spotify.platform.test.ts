jest.mock('@/config/env.js', () => ({
  env: {
    SPOTIFY_CLIENT_ID: 'test-client-id',
    SPOTIFY_CLIENT_SECRET: 'test-client-secret',
  },
}));

import {
  resetSpotifyTokenCacheForTests,
  resolveSpotify,
} from '@/agent/tools/play-music/spotify.platform.js';

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
  resetSpotifyTokenCacheForTests();
});

describe('resolveSpotify', () => {
  it('fetches token then searches tracks and returns spotify deeplink', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'spotify-token', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracks: {
            items: [{ id: 'track-123', name: 'Romantic Hindi Song' }],
          },
        }),
      });

    const result = await resolveSpotify('romantic hindi songs');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://accounts.spotify.com/api/token');
    expect(fetchMock.mock.calls[1][0]).toContain('https://api.spotify.com/v1/search?');
    expect(fetchMock.mock.calls[1][0]).toContain('type=track');
    expect(fetchMock.mock.calls[1][0]).toContain('limit=1');
    expect(fetchMock.mock.calls[1][0]).toContain('q=romantic+hindi+songs');
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        headers: { Authorization: 'Bearer spotify-token' },
      }),
    );
    expect(result).toEqual({
      url: 'spotify:track:track-123',
      platform: 'spotify',
      title: 'Romantic Hindi Song',
      id: 'track-123',
    });
  });

  it('reuses cached token for subsequent searches', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'spotify-token', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracks: { items: [{ id: 'track-1', name: 'Song One' }] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracks: { items: [{ id: 'track-2', name: 'Song Two' }] },
        }),
      });

    await resolveSpotify('first query');
    await resolveSpotify('second query');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe('https://accounts.spotify.com/api/token');
  });

  it('throws when no tracks are returned', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'spotify-token', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tracks: { items: [] } }),
      });

    await expect(resolveSpotify('unknown song')).rejects.toThrow(
      'No Spotify results found for query: unknown song',
    );
  });
});

describe('resolveSpotify missing credentials', () => {
  beforeEach(() => {
    jest.resetModules();
    resetSpotifyTokenCacheForTests();
  });

  it('throws when Spotify credentials are not configured', async () => {
    jest.doMock('@/config/env.js', () => ({
      env: {},
    }));

    const { resolveSpotify: resolveWithoutCredentials } = await import(
      '@/agent/tools/play-music/spotify.platform.js'
    );

    await expect(resolveWithoutCredentials('query')).rejects.toThrow(
      'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not configured',
    );
  });
});
