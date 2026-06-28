import { createApp, createHttpServer } from '@/app.js';
import { startAgenda, stopAgenda } from '@/config/agenda.js';
import { env } from '@/config/env.js';
import { connectMongo, disconnectMongo } from '@/config/mongodb.js';
import { ensureCollection } from '@/config/qdrant.js';
import * as userRepository from '@/repositories/user.repository.js';
import { upsertUserIdentity, upsertUserLocation } from '@/services/user-context.service.js';
import { attachMessageWebSocket } from '@/websocket/messages.gateway.js';
import { logger } from '@/utils/logger.js';

async function main(): Promise<void> {
  await connectMongo();
  await startAgenda();

  try {
    await ensureCollection();
    const user = await userRepository.findSingleUser();
    if (user) {
      await upsertUserIdentity(user);
      await upsertUserLocation(user);
    }
  } catch (err) {
    logger.warn({ err }, 'Qdrant init or backfill failed; continuing without vector index');
  }

  const app = createApp();
  const server = createHttpServer(app);
  const wss = attachMessageWebSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  function shutdown(signal: string): void {
    logger.info(`${signal} received. Shutting down gracefully...`);
    wss.close(() => {
      server.close(async (err) => {
        if (err) {
          logger.error({ err }, 'Error during server close');
          process.exit(1);
        }

        await stopAgenda();
        await disconnectMongo();
        logger.info('Server closed.');
        process.exit(0);
      });
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled rejection');
    // Escalate to uncaughtException so there is a single exit path.
    throw reason;
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
