import { MongoBackend } from '@agendajs/mongo-backend';
import { Agenda } from 'agenda';
import mongoose from 'mongoose';
import { env } from '@/config/env.js';
import { registerConversationSummaryJob } from '@/jobs/conversation-summary.job.js';
import { logger } from '@/utils/logger.js';

let agendaInstance: Agenda | null = null;

export function buildMongoAddress(
  uri: string = env.MONGODB_URI,
  databaseName: string = env.MONGODB_DATABASE,
): string {
  const withoutQuery = uri.split('?')[0] ?? uri;
  const segments = withoutQuery.split('/');

  if (segments.length > 3 && segments[segments.length - 1] !== '') {
    return uri;
  }

  const query = uri.includes('?') ? uri.slice(uri.indexOf('?')) : '';
  return `${withoutQuery}/${databaseName}${query}`;
}

export function getAgenda(): Agenda | null {
  return agendaInstance;
}

export async function startAgenda(): Promise<Agenda> {
  if (agendaInstance) {
    return agendaInstance;
  }

  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB must be connected before starting Agenda');
  }

  const agenda = new Agenda({
    backend: new MongoBackend({
      address: buildMongoAddress(),
      collection: 'agendaJobs',
    }),
    processEvery: '5 seconds',
  });

  registerConversationSummaryJob(agenda);
  await agenda.start();
  agendaInstance = agenda;
  logger.info('Agenda job scheduler started');

  return agenda;
}

export async function stopAgenda(): Promise<void> {
  if (!agendaInstance) {
    return;
  }

  await agendaInstance.stop();
  agendaInstance = null;
  logger.info('Agenda job scheduler stopped');
}
