import type { PlatformResolver } from './types.js';
import { throwUnsupportedPlatformError } from './unsupported-platform.js';

export const resolveAmazonMusic: PlatformResolver = async () => {
  throwUnsupportedPlatformError('amazon_music');
};
