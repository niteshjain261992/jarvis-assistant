import { handleActionAck } from '@/controllers/websocket/action-ack.controller.js';
import { handleLocationUpdate } from '@/controllers/websocket/location-update.controller.js';
import { handleUserPrompt } from '@/controllers/websocket/user-prompt.controller.js';
import type { WebSocketMessageController } from '@/controllers/websocket/types.js';
import type { InboundEnvelope } from '@/schemas/websocket/inbound-envelope.schema.js';

export const messageControllerRegistry: Record<
  InboundEnvelope['type'],
  WebSocketMessageController
> = {
  USER_PROMPT: handleUserPrompt,
  ACTION_ACK: handleActionAck,
  LOCATION_UPDATE: handleLocationUpdate,
};
