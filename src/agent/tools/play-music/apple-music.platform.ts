import type { PlatformResolver } from './types.js';
import { throwUnsupportedPlatformError } from './unsupported-platform.js';

export const resolveAppleMusic: PlatformResolver = async () => {
  throwUnsupportedPlatformError('apple_music');
};
