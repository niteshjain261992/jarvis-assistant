import { throwServerError } from '@/errors/index.js';

const IMPLEMENTED_PLATFORMS = ['youtube', 'spotify'] as const;

export function throwUnsupportedPlatformError(platform: string): never {
  throwServerError(
    `Platform "${platform}" is not supported yet. Supported platforms: ${IMPLEMENTED_PLATFORMS.join(', ')}`,
  );
}
