import {
  handleJarvisError,
  JarvisError,
  JarvisErrorType,
} from '@/errors/index.js';

describe('handleJarvisError', () => {
  const toolContext = {
    mode: 'tool' as const,
    onClientTimeout: (error: JarvisError) => ({
      status: 'client_timeout',
      type: error.type,
      message: error.message,
    }),
  };

  it('returns onClientTimeout result for CLIENT_TIMEOUT in tool mode', () => {
    const error = new JarvisError(
      JarvisErrorType.CLIENT_TIMEOUT,
      'Client task timed out after 10000ms',
    );

    expect(handleJarvisError(error, toolContext)).toEqual({
      status: 'client_timeout',
      type: JarvisErrorType.CLIENT_TIMEOUT,
      message: 'Client task timed out after 10000ms',
    });
  });

  it('rethrows CLIENT_ERROR', () => {
    const error = new JarvisError(JarvisErrorType.CLIENT_ERROR, 'Playback failed');
    expect(() => handleJarvisError(error, toolContext)).toThrow('Playback failed');
  });

  it('rethrows SERVER_ERROR', () => {
    const error = new JarvisError(JarvisErrorType.SERVER_ERROR, 'missing API key');
    expect(() => handleJarvisError(error, toolContext)).toThrow('missing API key');
  });

  it('rethrows unknown errors', () => {
    expect(() => handleJarvisError(new Error('unexpected'), toolContext)).toThrow('unexpected');
  });
});
