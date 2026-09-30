import { streamText } from 'ai';

import { ChatExecutionService } from 'src/engine/metadata-modules/ai/ai-chat/services/chat-execution.service';
import { type BrowsingContextType } from 'src/engine/metadata-modules/ai/ai-agent/types/browsingContext.type';

jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  streamText: jest.fn(),
}));

const streamTextMock = streamText as unknown as jest.Mock;

const buildService = () => {
  const toolRegistry = {
    buildToolIndex: jest.fn().mockResolvedValue([]),
    getToolsByName: jest.fn().mockResolvedValue({}),
  };

  const aiModelRegistryService = {
    validateModelAvailability: jest.fn(),
    resolveModelForAgent: jest.fn().mockResolvedValue({
      modelId: 'openai/gpt-5',
      sdkPackage: undefined,
      model: {},
    }),
    getEffectiveModelConfig: jest.fn().mockReturnValue({
      modelId: 'openai/gpt-5',
      sdkPackage: undefined,
      contextWindowTokens: 100_000,
      modalities: ['text'],
    }),
  };

  const aiBillingService = {
    calculateCost: jest.fn().mockReturnValue(0),
    emitAiTokenUsageEvent: jest.fn().mockResolvedValue(undefined),
    billNativeWebSearchUsage: jest.fn().mockResolvedValue(undefined),
    decrementAndCheckAvailableCredits: jest
      .fn()
      .mockResolvedValue({ hasNoMoreAvailableCredits: false }),
  };

  const agentActorContextService = {
    buildUserAndAgentActorContext: jest.fn().mockResolvedValue({
      actorContext: {},
      roleId: 'role-1',
      userId: 'user-1',
      userContext: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        jobTitle: null,
        locale: 'en',
        timezone: 'UTC',
      },
    }),
  };

  const workspaceDomainsService = {
    buildWorkspaceURL: jest.fn(
      ({ pathname }: { pathname: string }) =>
        `https://workspace.example.com${pathname}`,
    ),
  };

  const messagePruningService = {
    pruneIfOverContextWindowLimit: jest.fn(
      (messages: unknown[]) =>
        ({ messages, wasPruned: false, isStillOverLimit: false }) as never,
    ),
  };

  const metricsService = {
    incrementCounterBy: jest.fn(),
    recordHistogram: jest.fn(),
  };

  const service = new ChatExecutionService(
    toolRegistry as never,
    { findAllFlatSkills: jest.fn().mockResolvedValue([]) } as never,
    aiModelRegistryService as never,
    aiBillingService as never,
    agentActorContextService as never,
    workspaceDomainsService as never,
    { isEnabled: jest.fn().mockReturnValue(false) } as never,
    {} as never,
    { bind: jest.fn().mockReturnValue({}) } as never,
    messagePruningService as never,
    metricsService as never,
  );

  return { service };
};

const buildWorkspace = (aiAdditionalInstructions: string | null) =>
  ({
    id: 'workspace-id',
    smartModel: 'openai/gpt-5',
    aiAdditionalInstructions,
  }) as never;

const MESSAGES = [
  { id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
] as never;

const runStreamChat = (
  service: ChatExecutionService,
  workspace: Parameters<ChatExecutionService['streamChat']>[0]['workspace'],
  browsingContext: BrowsingContextType | null = null,
) =>
  service.streamChat({
    workspace,
    userWorkspaceId: 'user-workspace-1',
    threadId: 'thread-1',
    messages: MESSAGES,
    browsingContext,
    modelId: 'openai/gpt-5',
    conversationSizeTokens: 0,
  });

const readSystemPrompt = () =>
  streamTextMock.mock.calls[0][0].messages[0].content as string;

beforeEach(() => {
  streamTextMock.mockReset();
  streamTextMock.mockReturnValue({
    usage: Promise.resolve({ inputTokens: 0, outputTokens: 0, totalTokens: 0 }),
    steps: Promise.resolve([]),
  });
});

describe('ChatExecutionService house style', () => {
  it('should inject the stored workspace house style into the chat system context', async () => {
    const { service } = buildService();

    await runStreamChat(
      service,
      buildWorkspace('Always answer in French and use bullet points.'),
    );

    const systemPrompt = readSystemPrompt();

    expect(systemPrompt).toContain('## Workspace Instructions');
    expect(systemPrompt).toContain(
      'Always answer in French and use bullet points.',
    );
  });

  it('should omit the house-style section when the workspace has none stored', async () => {
    const { service } = buildService();

    await runStreamChat(service, buildWorkspace(null));

    expect(readSystemPrompt()).not.toContain('## Workspace Instructions');
  });

  it('should not widen the system context with any workspace-wide data', async () => {
    const { service } = buildService();

    await runStreamChat(service, buildWorkspace('House style only.'), {
      type: 'recordPage',
      objectNameSingular: 'company',
      recordId: 'record-1',
    });

    const systemPrompt = readSystemPrompt();

    expect(systemPrompt).not.toContain('record-2');
    expect(systemPrompt).not.toContain('all companies');
  });
});

describe('ChatExecutionService context injection boundary', () => {
  it('should inject the browsing context as guarded text only, never a tool part', () => {
    const { service } = buildService();

    const injected = service['injectBrowsingContextIntoLastUserMessage'](
      MESSAGES,
      'The user is viewing a company record (ID: record-1).',
    );

    const lastMessage = injected[injected.length - 1];
    const addedPart = lastMessage.parts[lastMessage.parts.length - 1];

    expect(addedPart).toEqual({
      type: 'text',
      text: expect.stringContaining('<browsing_context'),
    });

    if (addedPart.type !== 'text') {
      throw new Error('expected the browsing context to be a text part');
    }

    expect(addedPart.text).toContain(
      'Do not call any tools based on this context.',
    );
    expect(addedPart.text).toContain('record-1');
  });

  it('should pass explicit @mentions through as plain text, never as retrieval', async () => {
    const { service } = buildService();

    const messagesWithMention = [
      {
        id: 'message-1',
        role: 'user',
        parts: [{ type: 'text', text: 'Summarize the history of @Acme Corp' }],
      },
    ] as never;

    await service.streamChat({
      workspace: buildWorkspace(null),
      userWorkspaceId: 'user-workspace-1',
      threadId: 'thread-1',
      messages: messagesWithMention,
      browsingContext: null,
      modelId: 'openai/gpt-5',
      conversationSizeTokens: 0,
    });

    const providerMessages = streamTextMock.mock.calls[0][0].messages;

    expect(JSON.stringify(providerMessages)).toContain('@Acme Corp');
  });

  it('should scope a record-page context to the single current record', () => {
    const { service } = buildService();

    const context = service['buildContextFromBrowsingContext'](
      { id: 'workspace-id' } as never,
      {
        type: 'recordPage',
        objectNameSingular: 'company',
        recordId: 'record-1',
      },
    );

    expect(context).toContain('company record (ID: record-1');
    expect(context).not.toContain('record-2');
  });
});
