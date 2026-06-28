describe('logger', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('is a shared pino instance with level from env.LOG_LEVEL (production: no pretty transport)', () => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'production', LOG_LEVEL: 'warn' };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { logger } = require('@/utils/logger.js');

    expect(logger.level).toBe('warn');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.fatal).toBe('function');
  });

  it('configures the pino-pretty transport outside production', () => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'development', LOG_LEVEL: 'debug' };

    const pinoMock = jest.fn(() => ({ level: 'debug' }));
    jest.doMock('pino', () => ({ pino: pinoMock }));

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/utils/logger.js');

      expect(pinoMock).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
          transport: { target: 'pino-pretty' },
        }),
      );
    } finally {
      jest.dontMock('pino');
    }
  });

  it('returns the same instance on repeated imports', () => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'production', LOG_LEVEL: 'error' };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const first = require('@/utils/logger.js').logger;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const second = require('@/utils/logger.js').logger;

    expect(first).toBe(second);
  });
});
