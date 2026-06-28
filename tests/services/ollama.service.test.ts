import { errorCodes } from '@/utils/api-response.js';
import { logger } from '@/utils/logger.js';

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

const loggerDebugMock = logger.debug as jest.MockedFunction<typeof logger.debug>;
import {
  filterCompletedContextMessages,
  summarizeText,
} from '@/services/ollama.service.js';
import { env } from '@/config/env.js';

const fetchMock = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  fetchMock.mockReset();
  jest.clearAllMocks();
});

function okResponse(payload: unknown): Partial<Response> {
  return { ok: true, json: async () => payload };
}

describe('filterCompletedContextMessages', () => {
  it('keeps only completed messages with content', () => {
    const messages = [
      {
        _id: '1',
        conversationId: 'c1',
        type: 'text' as const,
        role: 'user' as const,
        sequenceNumber: 1,
        content: 'hello',
        status: 'completed' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: '2',
        conversationId: 'c1',
        type: 'text' as const,
        role: 'assistant' as const,
        sequenceNumber: 2,
        status: 'processing' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: '3',
        conversationId: 'c1',
        type: 'text' as const,
        role: 'user' as const,
        sequenceNumber: 3,
        content: '',
        status: 'completed' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    expect(filterCompletedContextMessages(messages)).toEqual([messages[0]]);
  });
});

describe('summarizeText', () => {
  it('returns trimmed summary text', async () => {
    fetchMock.mockResolvedValue(
      okResponse({ response: '  "User greeted Jarvis and received a reply."  ' }),
    );

    const summary = await summarizeText('user: hello\nassistant: Hi, Sir.');

    expect(summary).toBe('User greeted Jarvis and received a reply.');
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.options).toEqual({ temperature: 0.2 });
    expect(body.system).toContain('summary');
    expect(loggerDebugMock).toHaveBeenCalledWith(
      { llmOperation: 'summarizeText' },
      'LLM call started',
    );
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.objectContaining({ llmOperation: 'summarizeText', durationMs: expect.any(Number) }),
      'LLM call completed',
    );
  });

  it('calls the Ollama generate endpoint with configured model and URL', async () => {
    fetchMock.mockResolvedValue(okResponse({ response: 'Summary text.' }));

    await summarizeText('user: hello\nassistant: Hi');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${env.OLLAMA_BASE_URL}/api/generate`);
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: env.OLLAMA_MODEL,
      stream: false,
      options: { temperature: 0.2 },
    });
  });

  it('throws AppError 502 LLM_EMPTY_RESPONSE when the model returns empty text', async () => {
    fetchMock.mockResolvedValue(okResponse({ response: '   ' }));

    await expect(summarizeText('user: hello\nassistant: Hi')).rejects.toMatchObject({
      statusCode: 502,
      code: errorCodes.LLM_EMPTY_RESPONSE,
    });
  });

  it('throws AppError 502 LLM_UNAVAILABLE when fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(summarizeText('user: hello')).rejects.toMatchObject({
      statusCode: 502,
      code: errorCodes.LLM_UNAVAILABLE,
    });
  });

  it('throws AppError 502 LLM_ERROR_RESPONSE when Ollama returns non-2xx', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    await expect(summarizeText('user: hello')).rejects.toMatchObject({
      statusCode: 502,
      code: errorCodes.LLM_ERROR_RESPONSE,
    });
  });
});
