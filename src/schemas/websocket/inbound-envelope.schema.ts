import { z } from 'zod';

import { actionAckPayloadSchema } from '@/schemas/websocket/action-ack.schema.js';
import { locationUpdatePayloadSchema } from '@/schemas/websocket/location-update.schema.js';
import { userPromptPayloadSchema } from '@/schemas/websocket/user-prompt.schema.js';

export const inboundEnvelopeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('USER_PROMPT'),
    message_id: z.string().min(1),
    timestamp: z.number().int().positive(),
    payload: userPromptPayloadSchema,
  }),
  z.object({
    type: z.literal('ACTION_ACK'),
    message_id: z.string().min(1),
    timestamp: z.number().int().positive(),
    payload: actionAckPayloadSchema,
  }),
  z.object({
    type: z.literal('LOCATION_UPDATE'),
    message_id: z.string().min(1),
    timestamp: z.number().int().positive(),
    payload: locationUpdatePayloadSchema,
  }),
]);

export type InboundEnvelope = z.infer<typeof inboundEnvelopeSchema>;
export type UserPromptEnvelope = Extract<InboundEnvelope, { type: 'USER_PROMPT' }>;
export type ActionAckEnvelope = Extract<InboundEnvelope, { type: 'ACTION_ACK' }>;
export type LocationUpdateEnvelope = Extract<InboundEnvelope, { type: 'LOCATION_UPDATE' }>;

export function formatInboundEnvelopeValidationError(error: z.ZodError): string {
  const detail = error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`);
  return `Invalid request body — ${detail.join('; ')}`;
}
