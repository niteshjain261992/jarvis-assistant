import { z } from 'zod';

export const locationUpdatePayloadSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type LocationUpdatePayload = z.infer<typeof locationUpdatePayloadSchema>;
