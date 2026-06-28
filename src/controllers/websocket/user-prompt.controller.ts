import type { WebSocket } from 'ws';

import type { WebSocketControllerContext } from '@/controllers/websocket/types.js';
import * as messageService from '@/services/message.service.js';
import { AppError } from '@/utils/app-error.js';
import {
  envelopeFromAppError,
  envelopeFromCreateMessageResult,
  internalServerErrorEnvelope,
  type MessageEnvelope,
} from '@/utils/message-envelope.js';
import { logger } from '@/utils/logger.js';

function sendEnvelope(ws: WebSocket, envelope: MessageEnvelope): void {
  ws.send(JSON.stringify(envelope));
}

export async function handleUserPrompt(ctx: WebSocketControllerContext): Promise<void> {
  if (ctx.envelope.type !== 'USER_PROMPT') {
    return;
  }

  const { text } = ctx.envelope.payload;
  logger.debug({ promptLength: text.length }, 'Message request accepted');

  try {
    const result = await messageService.createMessage(text, ctx.ws);
    sendEnvelope(ctx.ws, envelopeFromCreateMessageResult(result));
  } catch (err) {
    if (err instanceof AppError && err.isOperational) {
      sendEnvelope(ctx.ws, envelopeFromAppError(err));
      return;
    }

    logger.error({ err }, 'Unexpected WebSocket message error');
    sendEnvelope(ctx.ws, internalServerErrorEnvelope());
  }
}
