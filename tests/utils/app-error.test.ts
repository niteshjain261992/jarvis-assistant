import { errorCodes } from '@/utils/api-response.js';
import { AppError } from '@/utils/app-error.js';

describe('AppError', () => {
  it('carries statusCode, derives code from status, and defaults isOperational to true', () => {
    const err = new AppError('Not found', 404);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(errorCodes.NOT_FOUND);
    expect(err.isOperational).toBe(true);
    expect(err.name).toBe('AppError');
  });

  it('falls back to the ERROR code for unmapped statuses', () => {
    expect(new AppError('Teapot', 418).code).toBe(errorCodes.ERROR);
  });

  it('accepts an explicit code', () => {
    const err = new AppError('LLM down', 502, errorCodes.LLM_UNAVAILABLE);

    expect(err.code).toBe(errorCodes.LLM_UNAVAILABLE);
  });

  it('allows overriding isOperational', () => {
    const err = new AppError('Broken invariant', 500, undefined, false);

    expect(err.statusCode).toBe(500);
    expect(err.code).toBe(errorCodes.INTERNAL_SERVER_ERROR);
    expect(err.isOperational).toBe(false);
  });

  it('captures a stack trace excluding the constructor frame', () => {
    const err = new AppError('Trace me', 400);

    expect(typeof err.stack).toBe('string');
    expect(err.stack).not.toContain('new AppError');
  });
});
