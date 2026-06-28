import request from 'supertest';

jest.mock('@/config/agenda.js', () => ({
  getAgenda: jest.fn(() => null),
  startAgenda: jest.fn(),
  stopAgenda: jest.fn(),
  buildMongoAddress: jest.fn(),
}));

// Mock the logger so no pino transport worker is spawned via the error middleware.
jest.mock('@/utils/logger.js', () => ({
  logger: {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  },
}));

import { createApp } from '@/app.js';

const app = createApp();

describe('createApp', () => {
  it('GET /health returns 200 with the success envelope', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('HEALTH_OK');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.uptime).toBe('number');
    expect(typeof res.body.data.timestamp).toBe('string');
  });

  it('applies helmet security headers', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns the error envelope with NOT_FOUND for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Route GET /does-not-exist not found',
      data: {},
    });
  });

  it('returns NOT_FOUND for POST /messages', async () => {
    const res = await request(app).post('/messages').send({ prompt: 'hello' });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Route POST /messages not found',
      data: {},
    });
  });

  it('masks malformed JSON bodies as a 500 through the global handler', async () => {
    const res = await request(app)
      .post('/does-not-exist')
      .set('Content-Type', 'application/json')
      .send('{not json');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      data: {},
    });
  });
});
