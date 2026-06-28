import type { Server as HttpServer } from 'node:http';
import type { RawData, WebSocket } from 'ws';
import { WebSocketServer } from 'ws';

import { messageControllerRegistry } from '@/controllers/websocket/index.js';
import {
  formatInboundEnvelopeValidationError,
  inboundEnvelopeSchema,
} from '@/schemas/websocket/inbound-envelope.schema.js';
import { badRequestEnvelope, type MessageEnvelope } from '@/utils/message-envelope.js';
import { logger } from '@/utils/logger.js';

function sendEnvelope(ws: WebSocket, envelope: MessageEnvelope): void {
  ws.send(JSON.stringify(envelope));
}

export async function handleRawMessage(ws: WebSocket, raw: RawData): Promise<void> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw.toString());
  } catch {
    sendEnvelope(ws, badRequestEnvelope('Invalid JSON frame'));
    return;
  }

  const validated = inboundEnvelopeSchema.safeParse(parsed);
  if (!validated.success) {
    sendEnvelope(ws, badRequestEnvelope(formatInboundEnvelopeValidationError(validated.error)));
    return;
  }

  const controller = messageControllerRegistry[validated.data.type];
  if (!controller) {
    sendEnvelope(ws, badRequestEnvelope('Unknown message type'));
    return;
  }

  await controller({ ws, envelope: validated.data });
}

export function attachMessageWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    logger.debug('WebSocket client connected');

    ws.on('message', (raw) => {
      void handleRawMessage(ws, raw);
    });

    ws.on('close', () => {
      logger.debug('WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err }, 'WebSocket error');
    });
  });

  return wss;
}
