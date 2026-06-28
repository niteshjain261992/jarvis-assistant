import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  OLLAMA_BASE_URL: z.url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().min(1).default('gemma4:12b'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017'),
  MONGODB_DATABASE: z.string().min(1).default('jarvis'),
  TAVILY_API_KEY: z.string().min(1),
  YOUTUBE_API_KEY: z.string().min(1).optional(),
  SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
  SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
  QDRANT_URL: z.url().default('http://localhost:6333'),
  EMBEDDING_MODEL: z.string().min(1).default('nomic-embed-text'),
  NOMINATIM_BASE_URL: z.url().default('https://nominatim.openstreetmap.org'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // The single allowed `console` exception: the logger is configured from the
  // validated env (LOG_LEVEL, NODE_ENV), so it cannot exist before this check passes.
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = Object.freeze(parsed.data);

export const isProduction = env.NODE_ENV === 'production';
