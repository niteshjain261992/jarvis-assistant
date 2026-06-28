import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';

import { JarvisError, JarvisErrorType } from '@/errors/index.js';
import { actionRequestEnvelope } from '@/utils/message-envelope.js';

export const CLIENT_TASK_TIMEOUT_MS = 10_000;

// Module-level map is acceptable: requestIds from crypto.randomUUID() are globally unique.
const pendingRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }
>();

export function requestFromClient(
  ws: WebSocket,
  action: string,
  input: Record<string, unknown>,
  timeoutMs?: number,
): Promise<unknown> {
  const requestId = randomUUID();
  const effectiveTimeoutMs = timeoutMs ?? CLIENT_TASK_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(
        new JarvisError(
          JarvisErrorType.CLIENT_TIMEOUT,
          `Client task timed out after ${effectiveTimeoutMs}ms`,
          { timeoutMs: effectiveTimeoutMs },
        ),
      );
    }, effectiveTimeoutMs);

    pendingRequests.set(requestId, {
      resolve: (value) => {
        clearTimeout(timeoutId);
        pendingRequests.delete(requestId);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        pendingRequests.delete(requestId);
        reject(error);
      },
    });

    ws.send(
      JSON.stringify(
        actionRequestEnvelope({
          requestId,
          actionName: action,
          actionPayload: input,
          actionExecutor: 'client',
        }),
      ),
    );
  });
}

export function resolveClientTask(requestId: string, result: unknown): void {
  const pending = pendingRequests.get(requestId);
  if (!pending) {
    return;
  }

  pending.resolve(result);
}

export function rejectClientTask(requestId: string, error: string): void {
  const pending = pendingRequests.get(requestId);
  if (!pending) {
    return;
  }

  pending.reject(new JarvisError(JarvisErrorType.CLIENT_ERROR, error));
}
