import { isJarvisError, JarvisError, JarvisErrorType } from '@/errors/index.js';

describe('JarvisError', () => {
  it('carries type, message, and optional details', () => {
    const error = new JarvisError(JarvisErrorType.SERVER_ERROR, 'YouTube API key missing', {
      platform: 'youtube',
    });

    expect(error.type).toBe(JarvisErrorType.SERVER_ERROR);
    expect(error.message).toBe('YouTube API key missing');
    expect(error.name).toBe('JarvisError');
    expect(error.details).toEqual({ platform: 'youtube' });
  });
});

describe('isJarvisError', () => {
  it('returns true for JarvisError instances', () => {
    expect(isJarvisError(new JarvisError(JarvisErrorType.CLIENT_ERROR, 'failed'))).toBe(true);
  });

  it('returns false for plain Error and non-errors', () => {
    expect(isJarvisError(new Error('failed'))).toBe(false);
    expect(isJarvisError(null)).toBe(false);
  });
});
