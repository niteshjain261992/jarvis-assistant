import { createServer, type Server } from 'node:http';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { globalErrorHandler, notFoundHandler } from '@/middlewares/error.middleware.js';
import { healthRouter } from '@/routes/health.route.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use('/health', healthRouter);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}

export function createHttpServer(app: Express): Server {
  return createServer(app);
}
