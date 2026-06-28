import type { Response } from 'express';
import {
  defaultCodeFor,
  errorCodes,
  ErrorResponse,
  successCodes,
  successResponse,
  SuccessResponse,
} from '@/utils/api-response.js';
import { AppError } from '@/utils/app-error.js';

function makeRes(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('successResponse', () => {
  it('sends the envelope with the given status', () => {
    const res = makeRes();

    successResponse(res, 200, successCodes.HEALTH_OK, 'all good', { a: 1 });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      code: 'HEALTH_OK',
      message: 'all good',
      data: { a: 1 },
    });
  });

  it('defaults data to an empty object', () => {
    const res = makeRes();

    successResponse(res, 200, successCodes.HEALTH_OK, 'all good');

    expect(res.json).toHaveBeenCalledWith({ code: 'HEALTH_OK', message: 'all good', data: {} });
  });
});

describe('SuccessResponse catalog', () => {
  it('HEALTH_OK sends 200 with its code and message', () => {
    const res = makeRes();

    SuccessResponse.HEALTH_OK(res, { status: 'ok' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      code: 'HEALTH_OK',
      message: 'Service is healthy',
      data: { status: 'ok' },
    });
  });
});

describe('ErrorResponse catalog', () => {
  it('BAD_REQUEST returns a 400 AppError with default and custom messages', () => {
    expect(ErrorResponse.BAD_REQUEST()).toMatchObject({
      statusCode: 400,
      code: errorCodes.BAD_REQUEST,
      message: 'Bad request',
      isOperational: true,
    });
    expect(ErrorResponse.BAD_REQUEST('nope').message).toBe('nope');
    expect(ErrorResponse.BAD_REQUEST()).toBeInstanceOf(AppError);
  });

  it('NOT_FOUND returns a 404 AppError', () => {
    expect(ErrorResponse.NOT_FOUND()).toMatchObject({
      statusCode: 404,
      code: errorCodes.NOT_FOUND,
      message: 'Not found',
    });
    expect(ErrorResponse.NOT_FOUND('missing')).toMatchObject({
      statusCode: 404,
      code: errorCodes.NOT_FOUND,
      message: 'missing',
    });
  });

  it('LLM factories return 502 AppErrors with distinct codes', () => {
    expect(ErrorResponse.LLM_UNAVAILABLE()).toMatchObject({
      statusCode: 502,
      code: errorCodes.LLM_UNAVAILABLE,
      message: 'Language model service is unavailable',
    });
    expect(ErrorResponse.LLM_ERROR_RESPONSE(503)).toMatchObject({
      statusCode: 502,
      code: errorCodes.LLM_ERROR_RESPONSE,
      message: 'Language model service returned an error (status 503)',
    });
    expect(ErrorResponse.LLM_EMPTY_RESPONSE()).toMatchObject({
      statusCode: 502,
      code: errorCodes.LLM_EMPTY_RESPONSE,
    });
  });
});

describe('defaultCodeFor', () => {
  it.each([
    [400, errorCodes.BAD_REQUEST],
    [404, errorCodes.NOT_FOUND],
    [500, errorCodes.INTERNAL_SERVER_ERROR],
    [502, errorCodes.BAD_GATEWAY],
  ])('maps %i to %s', (status, code) => {
    expect(defaultCodeFor(status)).toBe(code);
  });

  it('falls back to ERROR for unmapped statuses', () => {
    expect(defaultCodeFor(418)).toBe(errorCodes.ERROR);
  });
});
