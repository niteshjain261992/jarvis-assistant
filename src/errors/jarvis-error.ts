import { JarvisErrorType } from './types.js';

export class JarvisError extends Error {
  readonly type: JarvisErrorType;
  readonly details?: Record<string, unknown>;

  constructor(type: JarvisErrorType, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'JarvisError';
    this.type = type;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function isJarvisError(error: unknown): error is JarvisError {
  return error instanceof JarvisError;
}
