import { throwServerError } from '@/errors/index.js';

import { resolveAmazonMusic } from './amazon-music.platform.js';
import { resolveAppleMusic } from './apple-music.platform.js';
import { normalizePlatform } from './platform.js';
import { resolveSoundcloud } from './soundcloud.platform.js';
import { resolveSpotify } from './spotify.platform.js';
import type { PlatformResolver, ResolvedTrack } from './types.js';
import { resolveYoutube } from './youtube.platform.js';

const PLATFORM_RESOLVERS: Record<string, PlatformResolver> = {
  youtube: resolveYoutube,
  spotify: resolveSpotify,
  apple_music: resolveAppleMusic,
  amazon_music: resolveAmazonMusic,
  soundcloud: resolveSoundcloud,
};

export async function resolvePlayMusicUrl(query: string, platform: string): Promise<ResolvedTrack> {
  const normalizedPlatform = normalizePlatform(platform);
  const resolver = PLATFORM_RESOLVERS[normalizedPlatform];

  if (!resolver) {
    throwServerError(
      `Platform "${normalizedPlatform}" is not supported. Supported platforms: ${Object.keys(PLATFORM_RESOLVERS).join(', ')}`,
    );
  }

  return resolver(query);
}
