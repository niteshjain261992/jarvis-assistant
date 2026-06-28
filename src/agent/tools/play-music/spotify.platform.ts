import { throwServerError } from '@/errors/index.js';
import { env } from '@/config/env.js';

import type { PlatformResolver } from './types.js';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getSpotifyAccessToken(): Promise<string> {
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throwServerError('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not configured');
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throwServerError(`Spotify token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };

  return cachedToken.accessToken;
}

export const resolveSpotify: PlatformResolver = async (query) => {
  const accessToken = await getSpotifyAccessToken();
  const params = new URLSearchParams({ q: query, type: 'track', limit: '1' });
  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throwServerError(`Spotify search failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    tracks?: { items?: Array<{ id: string; name: string }> };
  };
  const track = data.tracks?.items?.[0];

  if (!track) {
    throwServerError(`No Spotify results found for query: ${query}`);
  }

  return {
    url: `spotify:track:${track.id}`,
    platform: 'spotify',
    title: track.name,
    id: track.id,
  };
};

export function resetSpotifyTokenCacheForTests(): void {
  cachedToken = null;
}
