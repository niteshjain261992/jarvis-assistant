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

jest.mock('@/config/env.js', () => ({
  env: { NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org' },
}));

import { reverseGeocode } from '@/services/geocoding.service.js';
import { logger } from '@/utils/logger.js';

const loggerErrorMock = logger.error as jest.MockedFunction<typeof logger.error>;

function mockFetchResponse(body: unknown, status = 200): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

function mockFetchThrow(err: Error): void {
  global.fetch = jest.fn().mockRejectedValue(err);
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('reverseGeocode', () => {
  it('assembles a compact name from structured address parts', async () => {
    mockFetchResponse({
      display_name: 'Too Long Display Name, India',
      address: {
        suburb: 'Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
      },
    });

    const result = await reverseGeocode(19.06, 72.83);
    expect(result).toBe('Bandra West, Mumbai, Maharashtra');
  });

  it('uses neighbourhood over suburb when both present', async () => {
    mockFetchResponse({
      display_name: 'Fallback',
      address: {
        neighbourhood: 'Linking Road',
        suburb: 'Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
      },
    });

    const result = await reverseGeocode(19.06, 72.83);
    expect(result).toBe('Linking Road, Mumbai, Maharashtra');
  });

  it('omits absent structured parts and joins the rest', async () => {
    mockFetchResponse({
      display_name: 'Fallback',
      address: {
        city: 'Mumbai',
        state: 'Maharashtra',
      },
    });

    const result = await reverseGeocode(19.06, 72.83);
    expect(result).toBe('Mumbai, Maharashtra');
  });

  it('falls back to display_name when no structured parts are present', async () => {
    mockFetchResponse({
      display_name: 'Some Remote Place, India',
      address: {},
    });

    const result = await reverseGeocode(0, 0);
    expect(result).toBe('Some Remote Place, India');
  });

  it('falls back to display_name when address is absent', async () => {
    mockFetchResponse({ display_name: 'Ocean Point' });

    const result = await reverseGeocode(0, 0);
    expect(result).toBe('Ocean Point');
  });

  it('returns null when neither structured parts nor display_name exist', async () => {
    mockFetchResponse({});

    const result = await reverseGeocode(0, 0);
    expect(result).toBeNull();
  });

  it('returns null on non-200 response and logs the error', async () => {
    mockFetchResponse({ error: 'Unable to geocode' }, 400);

    const result = await reverseGeocode(0, 0);
    expect(result).toBeNull();
    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('returns null on network error and logs the error', async () => {
    mockFetchThrow(new Error('ECONNREFUSED'));

    const result = await reverseGeocode(19.06, 72.83);
    expect(result).toBeNull();
    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('does not throw on network error', async () => {
    mockFetchThrow(new Error('timeout'));

    await expect(reverseGeocode(19.06, 72.83)).resolves.toBeNull();
  });

  it('sends a descriptive User-Agent header on every request', async () => {
    mockFetchResponse({ display_name: 'Somewhere' });

    await reverseGeocode(19.06, 72.83);

    const fetchMock = global.fetch as jest.Mock;
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toBeTruthy();
    expect(headers['User-Agent'].length).toBeGreaterThan(0);
  });
});
