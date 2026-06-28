export const DEFAULT_MUSIC_PLATFORM = 'youtube';

const PLATFORM_ALIASES: Record<string, string> = {
  youtube: 'youtube',
  you_tube: 'youtube',
  yt: 'youtube',
  spotify: 'spotify',
  apple_music: 'apple_music',
  amazon_music: 'amazon_music',
  soundcloud: 'soundcloud',
};

export function normalizePlatform(platform: string): string {
  const normalized = platform.trim().toLowerCase().replace(/\s+/g, '_');
  return PLATFORM_ALIASES[normalized] ?? normalized;
}
