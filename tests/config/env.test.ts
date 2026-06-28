// Make dotenv a no-op so only the process.env we control in each test matters.
jest.mock('dotenv/config', () => ({}));

const ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'OLLAMA_BASE_URL',
  'OLLAMA_MODEL',
  'LOG_LEVEL',
  'MONGODB_URI',
  'MONGODB_DATABASE',
  'TAVILY_API_KEY',
];

const REQUIRED_TEST_ENV = {
  TAVILY_API_KEY: 'test-key',
};

describe('env config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    Object.assign(process.env, REQUIRED_TEST_ENV);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('applies defaults when variables are absent', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env, isProduction } = require('@/config/env.js');

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.OLLAMA_BASE_URL).toBe('http://localhost:11434');
    expect(env.OLLAMA_MODEL).toBe('gemma4:12b');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.MONGODB_URI).toBe('mongodb://127.0.0.1:27017');
    expect(env.MONGODB_DATABASE).toBe('jarvis');
    expect(env.TAVILY_API_KEY).toBe('test-key');
    expect(isProduction).toBe(false);
  });

  it('uses provided values and computes isProduction', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '4000';
    process.env.LOG_LEVEL = 'warn';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env, isProduction } = require('@/config/env.js');

    expect(env.NODE_ENV).toBe('production');
    expect(env.PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe('warn');
    expect(isProduction).toBe(true);
  });

  it('exports a frozen env object', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env } = require('@/config/env.js');

    expect(Object.isFrozen(env)).toBe(true);
  });

  it('exits with a per-variable report on invalid env', () => {
    process.env.PORT = 'abc';

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit(1)');
    });

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/config/env.js');
    }).toThrow('process.exit(1)');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith('Invalid environment variables:');
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes('PORT'))).toBe(true);
  });

  it('exits when TAVILY_API_KEY is missing', () => {
    delete process.env.TAVILY_API_KEY;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit(1)');
    });

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/config/env.js');
    }).toThrow('process.exit(1)');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes('TAVILY_API_KEY'))).toBe(
      true,
    );
  });

  it('allows optional YOUTUBE_API_KEY to be omitted', () => {
    delete process.env.YOUTUBE_API_KEY;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env } = require('@/config/env.js');

    expect(env.YOUTUBE_API_KEY).toBeUndefined();
  });
});
