const mockInvoke = jest.fn();

jest.mock('@langchain/ollama', () => ({
  ChatOllama: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('langchain', () => ({
  createAgent: jest.fn(() => ({
    invoke: mockInvoke,
  })),
}));

jest.mock('@/services/user-context.service.js', () => ({
  retrieveUserContext: jest.fn().mockResolvedValue(''),
}));

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

import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { createAgent } from 'langchain';
import type { WebSocket } from 'ws';

import {
  CLARIFY_FALLBACK,
  CONVERSATION_SYSTEM_PROMPT,
  buildAgentMessages,
  buildAgentSystemPrompt,
  resolveAgentRunResult,
  runAgent,
} from '@/agent/agent-runner.js';
import * as agentTools from '@/agent/tools/index.js';
import type { MessageDocument } from '@/models/message.model.js';
import * as userContextService from '@/services/user-context.service.js';
import { logger } from '@/utils/logger.js';

const createAgentMock = createAgent as jest.MockedFunction<typeof createAgent>;
const retrieveUserContextMock = userContextService.retrieveUserContext as jest.MockedFunction<typeof userContextService.retrieveUserContext>;
const loggerErrorMock = logger.error as jest.MockedFunction<typeof logger.error>;

function createMockWebSocket(): WebSocket {
  return { send: jest.fn() } as unknown as WebSocket;
}

describe('buildAgentSystemPrompt', () => {
  it('includes Jarvis persona and prefer-text tool policy', async () => {
    const prompt = await buildAgentSystemPrompt('');

    expect(prompt).toContain(CONVERSATION_SYSTEM_PROMPT);
    expect(prompt).toContain('Conversational requests that need no external data or device action');
    expect(prompt).toContain('prefer answering with text');
  });

  it('does not contain an unconditional do-not-call-a-tool directive', async () => {
    const prompt = await buildAgentSystemPrompt('');

    expect(prompt).not.toMatch(/do not call any tool/i);
  });

  it('includes a generated freshness-rules section naming web_search', async () => {
    const prompt = await buildAgentSystemPrompt('');

    expect(prompt).toContain(
      'Some tools return information or perform actions that must not be reused from earlier in the conversation:',
    );
    expect(prompt).toContain('web_search');
    expect(prompt).toContain('do not reuse a previous answer from the conversation history');
  });

  it('generates the freshness section from the tool registry, not a hardcoded list', async () => {
    const rulesSpy = jest.spyOn(agentTools, 'getToolFreshnessRules').mockReturnValue([
      { toolName: 'fake_scratch_tool', refetchRequired: true, reason: 'is a made-up test tool' },
    ]);

    const prompt = await buildAgentSystemPrompt('');

    expect(prompt).toContain('fake_scratch_tool');
    expect(prompt).toContain('is a made-up test tool');
    rulesSpy.mockRestore();
  });

  it('omits the freshness section when no tool requires refetching', async () => {
    const rulesSpy = jest.spyOn(agentTools, 'getToolFreshnessRules').mockReturnValue([
      { toolName: 'durable_tool', refetchRequired: false, reason: 'never changes' },
    ]);

    const prompt = await buildAgentSystemPrompt('');

    expect(prompt).not.toContain(
      'Some tools return information or perform actions that must not be reused',
    );
    rulesSpy.mockRestore();
  });

  it('includes summary when provided', async () => {
    const prompt = await buildAgentSystemPrompt('', 'User asked about lights.');
    expect(prompt).toContain('Previous conversation summary:\nUser asked about lights.');
  });

  it('includes current IST date and time', async () => {
    const prompt = await buildAgentSystemPrompt('');

    expect(prompt).toMatch(/Current date and time: .+ \(IST, Asia\/Kolkata\)/);
  });

  it('includes Known information section when userContext is non-empty', async () => {
    const prompt = await buildAgentSystemPrompt('Name: Alice. Home: Mumbai.');

    expect(prompt).toContain('Known information about the user:\nName: Alice. Home: Mumbai.');
  });

  it('omits Known information section when userContext is empty', async () => {
    const prompt = await buildAgentSystemPrompt('');

    expect(prompt).not.toContain('Known information about the user:');
  });

  it('places the user context section before the summary section', async () => {
    const prompt = await buildAgentSystemPrompt('Name: Alice.', 'User asked about lights.');

    const userContextIdx = prompt.indexOf('Known information about the user:');
    const summaryIdx = prompt.indexOf('Previous conversation summary:');
    expect(userContextIdx).toBeGreaterThan(-1);
    expect(summaryIdx).toBeGreaterThan(-1);
    expect(userContextIdx).toBeLessThan(summaryIdx);
  });
});

describe('buildAgentMessages', () => {
  it('maps completed context roles to LangChain messages and appends the prompt', () => {
    const context: MessageDocument[] = [
      {
        _id: '1',
        conversationId: 'c1',
        type: 'text',
        role: 'user',
        sequenceNumber: 1,
        content: 'hello',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: '2',
        conversationId: 'c1',
        type: 'text',
        role: 'assistant',
        sequenceNumber: 2,
        content: 'Hi, Sir.',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: '3',
        conversationId: 'c1',
        type: 'text',
        role: 'user',
        sequenceNumber: 3,
        content: 'pending',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const messages = buildAgentMessages(context, 'open the camera');

    expect(messages).toHaveLength(3);
    expect(messages[0]?.getType()).toBe('human');
    expect(messages[1]?.getType()).toBe('ai');
    expect(messages[2]?.content).toBe('open the camera');
  });
});

describe('resolveAgentRunResult', () => {
  it('returns text when the last message is an AIMessage', async () => {
    await expect(
      resolveAgentRunResult([new AIMessage('My name is Jarvis, Sir.')]),
    ).resolves.toEqual({
      kind: 'text',
      content: 'My name is Jarvis, Sir.',
    });
  });

  it('returns text when last message is AIMessage even when preceded by tool-call messages', async () => {
    await expect(
      resolveAgentRunResult([
        new AIMessage({
          content: '',
          tool_calls: [
            {
              name: 'open_camera',
              args: {},
              id: 'call_1',
              type: 'tool_call',
            },
          ],
        }),
        new ToolMessage({
          content: JSON.stringify({
            commandName: 'OPEN:CAMERA',
            executor: 'client',
            payload: { target: 'camera', result: { opened: true } },
          }),
          tool_call_id: 'call_1',
        }),
        new AIMessage('Done, Sir.'),
      ]),
    ).resolves.toEqual({
      kind: 'text',
      content: 'Done, Sir.',
    });
  });

  it('returns clarify when messages are empty', async () => {
    await expect(resolveAgentRunResult([])).resolves.toEqual({
      kind: 'clarify',
      content: CLARIFY_FALLBACK,
    });
  });

  it('returns clarify when the last AIMessage has empty text content', async () => {
    await expect(
      resolveAgentRunResult([
        new AIMessage({
          content: '',
          tool_calls: [
            {
              name: 'open_camera',
              args: {},
              id: 'call_1',
              type: 'tool_call',
            },
          ],
        }),
      ]),
    ).resolves.toEqual({
      kind: 'clarify',
      content: CLARIFY_FALLBACK,
    });
  });

  it('returns clarify when the last AIMessage has whitespace-only text', async () => {
    await expect(resolveAgentRunResult([new AIMessage('   ')])).resolves.toEqual({
      kind: 'clarify',
      content: CLARIFY_FALLBACK,
    });
  });

  it('extracts text from array content blocks', async () => {
    await expect(
      resolveAgentRunResult([
        new AIMessage({
          content: [{ type: 'text', text: 'Hello from blocks, Sir.' }],
        }),
      ]),
    ).resolves.toEqual({
      kind: 'text',
      content: 'Hello from blocks, Sir.',
    });
  });
});

describe('runAgent', () => {
  const mockWs = createMockWebSocket();

  beforeEach(() => {
    mockInvoke.mockReset();
    createAgentMock.mockClear();
    retrieveUserContextMock.mockReset();
    retrieveUserContextMock.mockResolvedValue('');
  });

  it('returns text when the agent final message has no tool_calls', async () => {
    mockInvoke.mockResolvedValue({
      messages: [new AIMessage('Tell me a joke? Very well, Sir.')],
    });

    await expect(runAgent({ prompt: 'tell me a joke', context: [], userId: 'user-1' }, mockWs)).resolves.toEqual({
      kind: 'text',
      content: 'Tell me a joke? Very well, Sir.',
    });
  });

  it('returns clarify when agent invoke throws', async () => {
    mockInvoke.mockRejectedValue(new Error('recursion limit'));

    await expect(runAgent({ prompt: 'asdfgh', context: [], userId: 'user-1' }, mockWs)).resolves.toEqual({
      kind: 'clarify',
      content: CLARIFY_FALLBACK,
    });
  });

  it('forwards persistence context to buildToolsForConnection', async () => {
    const buildSpy = jest.spyOn(agentTools, 'buildToolsForConnection');
    mockInvoke.mockResolvedValue({
      messages: [new AIMessage('Hello, Sir.')],
    });

    const context = {
      conversationId: 'conv-1',
      userMessageId: 'user-1',
      actionSequenceNumber: 3,
    };
    await runAgent({ prompt: 'hello', context: [], userId: 'user-1' }, mockWs, context);

    expect(buildSpy).toHaveBeenCalledWith(mockWs, context);
    buildSpy.mockRestore();
  });

  it('uses the same runAgent path for conversational and tool-call prompts', async () => {
    mockInvoke
      .mockResolvedValueOnce({
        messages: [new AIMessage('I do not know your name, Sir.')],
      })
      .mockResolvedValueOnce({
        messages: [
          new AIMessage({
            content: '',
            tool_calls: [
              {
                name: 'open_camera',
                args: {},
                id: 'call_3',
                type: 'tool_call',
              },
            ],
          }),
          new ToolMessage({
            content: JSON.stringify({
              commandName: 'OPEN:CAMERA',
              executor: 'client',
              payload: { target: 'camera', result: { opened: true } },
            }),
            tool_call_id: 'call_3',
          }),
          new AIMessage('Camera is open, Sir.'),
        ],
      });

    const conversationalResult = await runAgent({ prompt: 'what is my name', context: [], userId: 'user-1' }, mockWs);
    const toolTurnResult = await runAgent({ prompt: 'open the camera', context: [], userId: 'user-1' }, mockWs);

    expect(createAgentMock).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(conversationalResult).toEqual({
      kind: 'text',
      content: 'I do not know your name, Sir.',
    });
    expect(toolTurnResult).toEqual({
      kind: 'text',
      content: 'Camera is open, Sir.',
    });
  });

  it('handles both conversational and tool-call turns by returning the final AIMessage text', async () => {
    mockInvoke
      .mockResolvedValueOnce({
        messages: [new AIMessage('Your name is whatever you told me, Sir.')],
      })
      .mockResolvedValueOnce({
        messages: [
          new AIMessage({
            content: '',
            tool_calls: [
              {
                name: 'open_camera',
                args: {},
                id: 'call_4',
                type: 'tool_call',
              },
            ],
          }),
          new ToolMessage({
            content: JSON.stringify({
              commandName: 'OPEN:CAMERA',
              executor: 'client',
              payload: { target: 'camera', result: { opened: true } },
            }),
            tool_call_id: 'call_4',
          }),
          new AIMessage('Opening the camera now, Sir.'),
        ],
      });

    await expect(runAgent({ prompt: 'what is my name', context: [], userId: 'user-1' }, mockWs)).resolves.toMatchObject(
      {
        kind: 'text',
      },
    );
    await expect(runAgent({ prompt: 'open the camera', context: [], userId: 'user-1' }, mockWs)).resolves.toMatchObject(
      {
        kind: 'text',
        content: 'Opening the camera now, Sir.',
      },
    );
  });

  it('calls retrieveUserContext with input.prompt and input.userId', async () => {
    mockInvoke.mockResolvedValue({ messages: [new AIMessage('Hi, Sir.')] });

    await runAgent({ prompt: 'where am I?', context: [], userId: 'user-42' }, mockWs);

    expect(retrieveUserContextMock).toHaveBeenCalledWith('where am I?', 'user-42');
  });

  it('injects retrieved context into the system prompt', async () => {
    retrieveUserContextMock.mockResolvedValue('Name: Alice. Location: Mumbai.');
    mockInvoke.mockResolvedValue({ messages: [new AIMessage('You are Alice in Mumbai, Sir.')] });

    await runAgent({ prompt: 'who am I?', context: [], userId: 'user-42' }, mockWs);

    const systemPromptArg = (createAgentMock.mock.calls[0] as [{ systemPrompt: string }])[0].systemPrompt;
    expect(systemPromptArg).toContain('Known information about the user:\nName: Alice. Location: Mumbai.');
  });

  it('still answers with empty context when retrieveUserContext throws', async () => {
    retrieveUserContextMock.mockRejectedValue(new Error('Qdrant exploded'));
    mockInvoke.mockResolvedValue({ messages: [new AIMessage('Sure, Sir.')] });

    const result = await runAgent({ prompt: 'hello', context: [], userId: 'user-42' }, mockWs);

    expect(result).toEqual({ kind: 'text', content: 'Sure, Sir.' });
    expect(loggerErrorMock).toHaveBeenCalled();
    const systemPromptArg = (createAgentMock.mock.calls[0] as [{ systemPrompt: string }])[0].systemPrompt;
    expect(systemPromptArg).not.toContain('Known information about the user:');
  });
});
