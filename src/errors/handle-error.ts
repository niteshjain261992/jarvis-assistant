import { isJarvisError, JarvisError } from './jarvis-error.js';
import { JarvisErrorType } from './types.js';

export type ToolErrorHandlingContext = {
  mode: 'tool';
  onClientTimeout: (error: JarvisError) => unknown;
};

export type ErrorHandlingContext = ToolErrorHandlingContext;

export function handleJarvisError(error: unknown, context: ErrorHandlingContext): unknown {
  if (!isJarvisError(error)) {
    throw error;
  }

  if (error.type === JarvisErrorType.CLIENT_TIMEOUT && context.mode === 'tool') {
    return context.onClientTimeout(error);
  }

  throw error;
}
