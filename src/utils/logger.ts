import { pino } from 'pino';
import { env, isProduction } from '@/config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  // pino-pretty is a devDependency; production emits raw JSON to stdout.
  ...(isProduction ? {} : { transport: { target: 'pino-pretty' } }),
});
