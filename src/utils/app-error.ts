import { defaultCodeFor, errorCodes } from '@/utils/api-response.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: errorCodes;
  public readonly isOperational: boolean;

  // Circular import with api-response.ts is safe: both sides only reference
  // each other inside function bodies, never during module evaluation.
  constructor(message: string, statusCode: number, code?: errorCodes, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code ?? defaultCodeFor(statusCode);
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}
