import type { WebSocket } from 'ws';

import type { WebSocketControllerContext } from '@/controllers/websocket/types.js';
import * as locationService from '@/services/location.service.js';
import { AppError } from '@/utils/app-error.js';
import {
  envelopeFromAppError,
  internalServerErrorEnvelope,
  type MessageEnvelope,
} from '@/utils/message-envelope.js';
import { logger } from '@/utils/logger.js';

function sendEnvelope(ws: WebSocket, envelope: MessageEnvelope): void {
  ws.send(JSON.stringify(envelope));
}

export async function handleLocationUpdate(ctx: WebSocketControllerContext): Promise<void> {
  if (ctx.envelope.type !== 'LOCATION_UPDATE') {
    return;
  }

  try {
    await locationService.processLocationUpdate(ctx.envelope);
  } catch (err) {
    if (err instanceof AppError && err.isOperational) {
      sendEnvelope(ctx.ws, envelopeFromAppError(err));
      return;
    }

    logger.error({ err }, 'Unexpected WebSocket location update error');
    sendEnvelope(ctx.ws, internalServerErrorEnvelope());
  }
}
