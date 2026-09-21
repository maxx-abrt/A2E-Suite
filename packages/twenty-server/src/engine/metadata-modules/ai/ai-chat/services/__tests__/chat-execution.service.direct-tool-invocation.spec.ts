import { streamText } from 'ai';
import { ToolCategory } from 'twenty-shared/ai';

import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';
import { ChatExecutionService } from 'src/engine/metadata-modules/ai/ai-chat/services/chat-execution.service';
import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';

jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  streamText: jest.fn(),
}));

const streamTextMock = streamText as unknown as jest.Mock;

const FORCED_TOOL_NAME = 'summarize_document';
const MUTATING_TOOL_NAME = 'create_task';

const buildCatalogEntry = (
  name: string,
  category: ToolCategory,
): ToolIndexEntry => ({
  name,
  label: name,
  description: `${name} description`,
  category,
  executionRef: { kind: 'logic_function', logicFunctionId: `${name}-id` },
});

const buildService = () => {
  const toolCatalog: ToolIndexEntry[] = [
    buildCatalogEntry(FORCED_TOOL_NAME, ToolCategory.LOGIC_FUNCTION),
    buildCatalogEntry(MUTATING_TOOL_NAME, ToolCategory.DATABASE_CRUD),
  ];

  const forcedTool = {
    description: 'summarize a document',
    inputSchema: {},
    execute: jest.fn(),
  };

  const toolRegistry = {
    buildToolIndex: jest.fn().mockResolvedValue(toolCatalog),
    getToolsByName: jest.fn((names: string[]) =>
      names.includes(FORCED_TOOL_NAME)
        ? { [FORCED_TOOL_NAME]: forcedTool }
        : {},
    ),
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
    {} as never,
    { isEnabled: jest.fn().mockReturnValue(false) } as never,
    {} as never,
    { bind: jest.fn().mockReturnValue({}) } as never,
    messagePruningService as never,
    metricsService as never,
  );

  return { service, toolRegistry };
};

const WORKSPACE = {
  id: 'workspace-id',
  smartModel: 'openai/gpt-5',
  aiAdditionalInstructions: null,
} as never;

const MESSAGES = [
  { id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
] as never;

const runStreamChat = (
  service: ChatExecutionService,
  directToolInvocation: string | null,
) =>
  service.streamChat({
    workspace: WORKSPACE,
    userWorkspaceId: 'user-workspace-1',
    threadId: 'thread-1',
    messages: MESSAGES,
    browsingContext: null,
    directToolInvocation,
    modelId: 'openai/gpt-5',
    conversationSizeTokens: 0,
  });

beforeEach(() => {
  streamTextMock.mockReset();
  streamTextMock.mockReturnValue({
    usage: Promise.resolve({ inputTokens: 0, outputTokens: 0, totalTokens: 0 }),
    steps: Promise.resolve([]),
  });
});

describe('ChatExecutionService direct tool invocation', () => {
  it('forces the named read-only tool on the turn and hands it to the provider', async () => {
    const { service } = buildService();

    await runStreamChat(service, FORCED_TOOL_NAME);

    expect(streamTextMock).toHaveBeenCalledTimes(1);

    const streamCall = streamTextMock.mock.calls[0][0];

    expect(streamCall.toolChoice).toEqual({
      type: 'tool',
      toolName: FORCED_TOOL_NAME,
    });
    expect(Object.keys(streamCall.tools)).toContain(FORCED_TOOL_NAME);
  });

  it('refuses an unknown tool before any provider call', async () => {
    const { service } = buildService();

    await expect(
      runStreamChat(service, 'app_foreign_workspace_tool'),
    ).rejects.toMatchObject({
      code: AiExceptionCode.DIRECT_TOOL_INVOCATION_NOT_AVAILABLE,
    });

    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it('never forces a mutating tool — the turn stays on the draft path', async () => {
    const { service } = buildService();

    await runStreamChat(service, MUTATING_TOOL_NAME);

    expect(streamTextMock).toHaveBeenCalledTimes(1);

    const streamCall = streamTextMock.mock.calls[0][0];

    expect(streamCall.toolChoice).toBe('auto');
    expect(Object.keys(streamCall.tools)).not.toContain(MUTATING_TOOL_NAME);
  });

  it('is unchanged when no direct invocation is requested', async () => {
    const { service } = buildService();

    await runStreamChat(service, null);

    expect(streamTextMock.mock.calls[0][0].toolChoice).toBe('auto');
  });

  it('uses the DIRECT_TOOL_INVOCATION_NOT_AVAILABLE exception for every denial', async () => {
    const { service } = buildService();

    await expect(runStreamChat(service, 'unknown_tool')).rejects.toBeInstanceOf(
      AiException,
    );
  });
});
