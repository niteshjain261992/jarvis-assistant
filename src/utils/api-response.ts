import type { Response } from 'express';
import { AppError } from '@/utils/app-error.js';

export enum successCodes {
  HEALTH_OK = 'HEALTH_OK',
  MESSAGE_COMPLETED = 'MESSAGE_COMPLETED',
  MESSAGE_FAILED = 'MESSAGE_FAILED',
  ACTION_REQUEST = 'ACTION_REQUEST',
}

export enum errorCodes {
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_GATEWAY = 'BAD_GATEWAY',
  ERROR = 'ERROR',
  LLM_UNAVAILABLE = 'LLM_UNAVAILABLE',
  LLM_ERROR_RESPONSE = 'LLM_ERROR_RESPONSE',
  LLM_EMPTY_RESPONSE = 'LLM_EMPTY_RESPONSE',
}

const statusToCode: Record<number, errorCodes> = {
  400: errorCodes.BAD_REQUEST,
  404: errorCodes.NOT_FOUND,
  500: errorCodes.INTERNAL_SERVER_ERROR,
  502: errorCodes.BAD_GATEWAY,
};

export function defaultCodeFor(statusCode: number): errorCodes {
  return statusToCode[statusCode] ?? errorCodes.ERROR;
}

export function successResponse(
  res: Response,
  httpStatusCode: number,
  code: successCodes,
  message: string,
  data: object = {},
): void {
  res.status(httpStatusCode).json({ code, message, data });
}

export const SuccessResponse = {
  HEALTH_OK: (res: Response, data: object) =>
    successResponse(res, 200, successCodes.HEALTH_OK, 'Service is healthy', data),
};

export const ErrorResponse = {
  BAD_REQUEST: (message: string = 'Bad request') =>
    new AppError(message, 400, errorCodes.BAD_REQUEST),
  NOT_FOUND: (message: string = 'Not found') => new AppError(message, 404, errorCodes.NOT_FOUND),
  LLM_UNAVAILABLE: () =>
    new AppError('Language model service is unavailable', 502, errorCodes.LLM_UNAVAILABLE),
  LLM_ERROR_RESPONSE: (upstreamStatus: number) =>
    new AppError(
      `Language model service returned an error (status ${upstreamStatus})`,
      502,
      errorCodes.LLM_ERROR_RESPONSE,
    ),
  LLM_EMPTY_RESPONSE: () =>
    new AppError('Language model returned an empty response', 502, errorCodes.LLM_EMPTY_RESPONSE),
};
