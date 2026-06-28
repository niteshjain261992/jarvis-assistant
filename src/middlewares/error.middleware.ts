import type { NextFunction, Request, Response } from 'express';
import { isProduction } from '@/config/env.js';
import { errorCodes } from '@/utils/api-response.js';
import { AppError } from '@/utils/app-error.js';
import { logger } from '@/utils/logger.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
}

export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      data: {},
      ...(isProduction ? {} : { stack: err.stack }),
    });
    return;
  }

  // Programmer/unknown error: log everything, leak nothing.
  logger.error({ err }, 'Unexpected error');

  res.status(500).json({
    code: errorCodes.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    data: {},
    ...(isProduction ? {} : { stack: err instanceof Error ? err.stack : String(err) }),
  });
}
