import mongoose from 'mongoose';
import { env } from '@/config/env.js';
import { logger } from '@/utils/logger.js';

export async function connectMongo(
  uri: string = env.MONGODB_URI,
  databaseName: string = env.MONGODB_DATABASE,
): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(uri, { dbName: databaseName });
  logger.info({ database: databaseName }, 'Connected to MongoDB');
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
}
