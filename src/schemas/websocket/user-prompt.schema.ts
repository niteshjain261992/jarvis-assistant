import { z } from 'zod';

export const userPromptPayloadSchema = z.object({
  text: z.string().trim().min(1, 'text must be a non-empty string').max(500),
  input_method: z.enum(['voice', 'chat']),
});

export type UserPromptPayload = z.infer<typeof userPromptPayloadSchema>;
