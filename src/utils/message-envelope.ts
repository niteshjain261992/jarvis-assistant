import type { CreateMessageResult } from '@/services/message.service.js';
import type { MessageActionExecutor } from '@/models/message.model.js';
import { errorCodes, successCodes } from '@/utils/api-response.js';
import { AppError } from '@/utils/app-error.js';

export interface MessageEnvelope {
  code: string;
  message: string;
  data: object;
}

export function envelopeFromCreateMessageResult(result: CreateMessageResult): MessageEnvelope {
  if (result.status === 'failed') {
    return {
      code: successCodes.MESSAGE_FAILED,
      message: 'Message failed',
      data: result,
    };
  }

  return {
    code: successCodes.MESSAGE_COMPLETED,
    message: 'Message completed',
    data: result,
  };
}

export function envelopeFromAppError(err: AppError): MessageEnvelope {
  return {
    code: err.code,
    message: err.message,
    data: {},
  };
}

export function badRequestEnvelope(message: string): MessageEnvelope {
  return {
    code: errorCodes.BAD_REQUEST,
    message,
    data: {},
  };
}

export function internalServerErrorEnvelope(): MessageEnvelope {
  return {
    code: errorCodes.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    data: {},
  };
}

export function actionRequestEnvelope(input: {
  requestId: string;
  actionName: string;
  actionPayload: Record<string, unknown>;
  actionExecutor: MessageActionExecutor;
}): MessageEnvelope {
  return {
    code: successCodes.ACTION_REQUEST,
    message: 'Action requested',
    data: {
      type: 'action',
      status: 'pending',
      requestId: input.requestId,
      actionName: input.actionName,
      actionExecutor: input.actionExecutor,
      actionPayload: input.actionPayload,
    },
  };
}
