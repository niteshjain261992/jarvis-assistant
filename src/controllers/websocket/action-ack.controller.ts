import type { WebSocketControllerContext } from '@/controllers/websocket/types.js';
import { rejectClientTask, resolveClientTask } from '@/websocket/client-task-broker.js';

export async function handleActionAck(ctx: WebSocketControllerContext): Promise<void> {
  if (ctx.envelope.type !== 'ACTION_ACK') {
    return;
  }

  const { payload } = ctx.envelope;

  if (payload.status === 'SUCCESS') {
    resolveClientTask(payload.original_server_message_id, payload);
    return;
  }

  rejectClientTask(
    payload.original_server_message_id,
    payload.error_details ?? 'Action failed',
  );
}
