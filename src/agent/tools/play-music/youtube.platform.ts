import { throwServerError } from '@/errors/index.js';
import { env } from '@/config/env.js';

import type { PlatformResolver } from './types.js';

export const resolveYoutube: PlatformResolver = async (query) => {
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throwServerError('YOUTUBE_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    videoCategoryId: '10',
    maxResults: '1',
    key: apiKey,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!response.ok) {
    throwServerError(`YouTube search failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    items?: Array<{ id: { videoId?: string }; snippet: { title: string } }>;
  };
  const item = data.items?.[0];
  const videoId = item?.id?.videoId;

  if (!videoId) {
    throwServerError(`No YouTube results found for query: ${query}`);
  }

  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    platform: 'youtube',
    title: item.snippet.title,
    id: videoId,
  };
};
