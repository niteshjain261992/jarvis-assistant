import type { PlatformResolver } from './types.js';
import { throwUnsupportedPlatformError } from './unsupported-platform.js';

export const resolveSoundcloud: PlatformResolver = async () => {
  throwUnsupportedPlatformError('soundcloud');
};
