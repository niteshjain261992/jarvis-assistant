import {
  JarvisErrorType,
  throwClientError,
  throwClientTimeout,
  throwServerError,
} from '@/errors/index.js';

describe('throw-error factories', () => {
  it('throwClientTimeout throws CLIENT_TIMEOUT', () => {
    expect(() => throwClientTimeout('Client task timed out after 10000ms')).toThrow(
      expect.objectContaining({
        type: JarvisErrorType.CLIENT_TIMEOUT,
        message: 'Client task timed out after 10000ms',
      }),
    );
  });

  it('throwClientError throws CLIENT_ERROR', () => {
    expect(() => throwClientError('Playback failed')).toThrow(
      expect.objectContaining({
        type: JarvisErrorType.CLIENT_ERROR,
        message: 'Playback failed',
      }),
    );
  });

  it('throwServerError throws SERVER_ERROR with details', () => {
    try {
      throwServerError('Resolver failed', { query: 'song' });
    } catch (error) {
      expect(error).toMatchObject({
        type: JarvisErrorType.SERVER_ERROR,
        message: 'Resolver failed',
        details: { query: 'song' },
      });
    }
  });
});
