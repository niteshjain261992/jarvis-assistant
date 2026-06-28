import { JarvisError } from './jarvis-error.js';
import { JarvisErrorType } from './types.js';

export function throwClientTimeout(message: string, details?: Record<string, unknown>): never {
  throw new JarvisError(JarvisErrorType.CLIENT_TIMEOUT, message, details);
}

export function throwClientError(message: string, details?: Record<string, unknown>): never {
  throw new JarvisError(JarvisErrorType.CLIENT_ERROR, message, details);
}

export function throwServerError(message: string, details?: Record<string, unknown>): never {
  throw new JarvisError(JarvisErrorType.SERVER_ERROR, message, details);
}
