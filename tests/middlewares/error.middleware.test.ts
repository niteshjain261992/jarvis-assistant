import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@/utils/app-error.js';

// Mock the logger so no pino transport is spawned and calls can be asserted.
jest.mock('@/utils/logger.js', () => ({
  logger: {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  },
}));

import { globalErrorHandler, notFoundHandler } from '@/middlewares/error.middleware.js';
import { logger } from '@/utils/logger.js';

function makeRes(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

const noopNext: NextFunction = () => undefined;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('notFoundHandler', () => {
  it('forwards a 404 AppError for unmatched routes', () => {
    const req = { method: 'GET', originalUrl: '/nope' } as Request;
    const next = jest.fn();

    notFoundHandler(req, makeRes(), next);

    const err = next.mock.calls[0]?.[0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Route GET /nope not found');
  });
});

describe('globalErrorHandler', () => {
  it('responds with the error envelope for operational errors (stack outside production)', () => {
    const res = makeRes();

    globalErrorHandler(new AppError('Teapot', 418), {} as Request, res, noopNext);

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'ERROR',
        message: 'Teapot',
        data: {},
        stack: expect.any(String),
      }),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('uses the AppError code in the envelope', () => {
    const res = makeRes();

    globalErrorHandler(new AppError('Missing', 404), {} as Request, res, noopNext);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NOT_FOUND' }));
  });

  it('logs unknown errors and masks them as 500', () => {
    const res = makeRes();
    const boom = new TypeError('boom');

    globalErrorHandler(boom, {} as Request, res, noopNext);

    expect(logger.error).toHaveBeenCalledWith({ err: boom }, 'Unexpected error');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        data: {},
      }),
    );
  });

  it('treats non-operational AppError as unknown', () => {
    const res = makeRes();

    globalErrorHandler(new AppError('invariant', 500, undefined, false), {} as Request, res, noopNext);

    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('handles non-Error throwables on the unknown path', () => {
    const res = makeRes();

    globalErrorHandler('a string error', {} as Request, res, noopNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });

  it('omits stack traces in production', () => {
    jest.resetModules();
    const originalEnv = process.env;
    process.env = { ...originalEnv, NODE_ENV: 'production' };

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const prodMiddleware = require('@/middlewares/error.middleware.js');
      // Use the freshly-registered AppError class so instanceof matches.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppError: FreshAppError } = require('@/utils/app-error.js');
      const res = makeRes();

      prodMiddleware.globalErrorHandler(new FreshAppError('Teapot', 418), {} as Request, res, noopNext);

      expect(res.status).toHaveBeenCalledWith(418);
      const body = (res.json as jest.Mock).mock.calls[0]?.[0];
      expect(body).toEqual({ code: 'ERROR', message: 'Teapot', data: {} });
      expect(body).not.toHaveProperty('stack');

      const unknownRes = makeRes();
      prodMiddleware.globalErrorHandler(new TypeError('boom'), {} as Request, unknownRes, noopNext);

      expect(unknownRes.status).toHaveBeenCalledWith(500);
      const unknownBody = (unknownRes.json as jest.Mock).mock.calls[0]?.[0];
      expect(unknownBody).toEqual({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        data: {},
      });
    } finally {
      process.env = originalEnv;
      jest.resetModules();
    }
  });
});
