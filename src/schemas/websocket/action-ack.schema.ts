import { z } from 'zod';

export const actionAckPayloadSchema = z
  .object({
    original_server_message_id: z.string().min(1),
    action_executed: z.string().min(1),
    status: z.enum(['SUCCESS', 'FAILURE']),
    error_details: z.string().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'SUCCESS' && data.error_details !== null) {
      ctx.addIssue({
        code: 'custom',
        message: 'error_details must be null when status is SUCCESS',
        path: ['error_details'],
      });
    }

    if (data.status === 'FAILURE' && (!data.error_details || data.error_details.trim() === '')) {
      ctx.addIssue({
        code: 'custom',
        message: 'error_details must be a non-empty string when status is FAILURE',
        path: ['error_details'],
      });
    }
  });

export type ActionAckPayload = z.infer<typeof actionAckPayloadSchema>;
