import type { WebSocket } from 'ws';

import type { InboundEnvelope } from '@/schemas/websocket/inbound-envelope.schema.js';

export interface WebSocketControllerContext {
  ws: WebSocket;
  envelope: InboundEnvelope;
}

export type WebSocketMessageController = (ctx: WebSocketControllerContext) => Promise<void>;
