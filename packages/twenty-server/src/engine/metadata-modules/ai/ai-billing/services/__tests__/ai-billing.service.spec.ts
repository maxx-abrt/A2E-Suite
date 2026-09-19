import { type LanguageModelUsage } from 'ai';
import { DiscoveryService } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';

import { BillingUsageService } from 'src/engine/core-modules/billing/services/billing-usage.service';
import { EventLogEmitterService } from 'src/engine/core-modules/event-logs/emit/event-log-emitter.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { USAGE_RECORDED } from 'src/engine/core-modules/usage/constants/usage-recorded.constant';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { UsageResourceType } from 'src/engine/core-modules/usage/enums/usage-resource-type.enum';
import { UsageUnit } from 'src/engine/core-modules/usage/enums/usage-unit.enum';
import { UsageRecorderService } from 'src/engine/core-modules/usage/services/usage-recorder.service';
import { type UsageEvent } from 'src/engine/core-modules/usage/types/usage-event.type';
import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';
import { NATIVE_WEB_SEARCH_COST_PER_CALL_DOLLARS } from 'src/engine/metadata-modules/ai/ai-billing/constants/native-web-search-cost-per-call-dollars';
import { AiBillingService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-billing.service';
import { convertDollarsToCreditsMicro } from 'src/engine/metadata-modules/ai/ai-billing/utils/convert-dollars-to-credits-micro.util';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';

const WORKSPACE_ID = 'workspace-1';
const USER_WORKSPACE_ID = 'user-workspace-1';
const MODEL_ID = 'openai/gpt-5.2';

describe('AiBillingService usage logging', () => {
  let service: AiBillingService;
  let emitCustomBatchEvent: jest.Mock;
  let assertUsageAllowed: jest.Mock;
  let consumeUsageQuota: jest.Mock;

  // The real UsageRecorderService is wired in so the assertion is on the
  // USAGE_RECORDED batch the event-logs bridge consumes, not on a mocked seam.
  const recordedUsageEvents = (): UsageEvent[] =>
    emitCustomBatchEvent.mock.calls.flatMap((call) => call[1] as UsageEvent[]);

  beforeEach(async () => {
    emitCustomBatchEvent = jest.fn();
    assertUsageAllowed = jest.fn().mockResolvedValue(undefined);
    consumeUsageQuota = jest
      .fn()
      .mockResolvedValue({ hasNoMoreAvailableCredits: false });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiBillingService,
        UsageRecorderService,
        {
          provide: AiModelRegistryService,
          useValue: { getEffectiveModelConfig: jest.fn() },
        },
        {
          provide: BillingUsageService,
          useValue: { assertUsageAllowed, consumeUsageQuota },
        },
        {
          provide: WorkspaceEventEmitter,
          useValue: { emitCustomBatchEvent },
        },
        {
          provide: EventLogEmitterService,
          useValue: { isEnabled: jest.fn().mockReturnValue(true) },
        },
        {
          provide: TwentyConfigService,
          useValue: { get: jest.fn().mockReturnValue(false) },
        },
        {
          provide: DiscoveryService,
          useValue: { getProviders: () => [] },
        },
      ],
    }).compile();

    service = module.get<AiBillingService>(AiBillingService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes an AI token usage entry per assistant turn to the event-logs bridge', async () => {
    await service.emitAiTokenUsageEvent(
      WORKSPACE_ID,
      4_200,
      700,
      MODEL_ID,
      UsageOperationType.AI_CHAT_TOKEN,
      'agent-9',
      USER_WORKSPACE_ID,
    );

    expect(emitCustomBatchEvent).toHaveBeenCalledWith(
      USAGE_RECORDED,
      [
        expect.objectContaining({
          resourceType: UsageResourceType.AI,
          operationType: UsageOperationType.AI_CHAT_TOKEN,
          creditsUsedMicro: 4_200,
          quantity: 700,
          unit: UsageUnit.TOKEN,
          resourceId: 'agent-9',
          resourceContext: MODEL_ID,
          spenders: { userWorkspaceId: USER_WORKSPACE_ID, agentId: 'agent-9' },
        }),
      ],
      WORKSPACE_ID,
    );
  });

  it('keeps resourceId null when no agent is attached to the assistant call', async () => {
    await service.emitAiTokenUsageEvent(
      WORKSPACE_ID,
      10,
      3,
      MODEL_ID,
      UsageOperationType.AI_CHAT_TOKEN,
      null,
      USER_WORKSPACE_ID,
    );

    expect(recordedUsageEvents()).toEqual([
      expect.objectContaining({
        resourceId: null,
        resourceContext: MODEL_ID,
      }),
    ]);
  });

  it('writes a web-search invocation usage entry and charges the quota', async () => {
    const callCount = 3;

    await service.billNativeWebSearchUsage(
      callCount,
      WORKSPACE_ID,
      USER_WORKSPACE_ID,
    );

    expect(consumeUsageQuota).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        resourceType: UsageResourceType.AI,
        operationType: UsageOperationType.WEB_SEARCH,
        spenders: { userWorkspaceId: USER_WORKSPACE_ID },
        cost: {
          creditsUsedMicro: convertDollarsToCreditsMicro(
            callCount * NATIVE_WEB_SEARCH_COST_PER_CALL_DOLLARS,
          ),
          quantity: callCount,
        },
      }),
    );

    expect(recordedUsageEvents()).toEqual([
      expect.objectContaining({
        operationType: UsageOperationType.WEB_SEARCH,
        unit: UsageUnit.INVOCATION,
        quantity: callCount,
      }),
    ]);
  });

  it('writes nothing when no native web search call happened', async () => {
    await service.billNativeWebSearchUsage(0, WORKSPACE_ID, USER_WORKSPACE_ID);

    expect(consumeUsageQuota).not.toHaveBeenCalled();
    expect(emitCustomBatchEvent).not.toHaveBeenCalled();
  });

  it('decrements quota per step without writing a second usage entry', async () => {
    jest.spyOn(service, 'calculateCost').mockReturnValue(0.25);

    const result = await service.decrementAndCheckAvailableCredits({
      modelId: MODEL_ID,
      billingInput: {
        usage: {
          inputTokens: 100,
          outputTokens: 20,
        } as LanguageModelUsage,
      },
      workspaceId: WORKSPACE_ID,
      operationType: UsageOperationType.AI_CHAT_TOKEN,
      spenders: { userWorkspaceId: USER_WORKSPACE_ID },
    });

    expect(result).toEqual({ hasNoMoreAvailableCredits: false });
    expect(consumeUsageQuota).toHaveBeenCalledTimes(1);
    expect(emitCustomBatchEvent).not.toHaveBeenCalled();
  });

  it('bills and logs a turn through calculateAndBillUsage', async () => {
    jest.spyOn(service, 'calculateCost').mockReturnValue(0.5);

    await service.calculateAndBillUsage(
      MODEL_ID,
      { usage: { inputTokens: 100, outputTokens: 50 } as LanguageModelUsage },
      WORKSPACE_ID,
      UsageOperationType.AI_CHAT_TOKEN,
    );

    expect(consumeUsageQuota).toHaveBeenCalledWith(
      expect.objectContaining({
        cost: {
          creditsUsedMicro: convertDollarsToCreditsMicro(0.5),
          quantity: 150,
        },
      }),
    );
    expect(recordedUsageEvents()).toEqual([
      expect.objectContaining({
        resourceType: UsageResourceType.AI,
        operationType: UsageOperationType.AI_CHAT_TOKEN,
        quantity: 150,
        unit: UsageUnit.TOKEN,
      }),
    ]);
  });

  it('delegates the pre-execution gate to the billing service with the AI resource type', async () => {
    await service.assertAiExecutionAllowed({
      workspaceId: WORKSPACE_ID,
      operationType: UsageOperationType.AI_CHAT_TOKEN,
      spenders: { userWorkspaceId: USER_WORKSPACE_ID },
    });

    expect(assertUsageAllowed).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      resourceType: UsageResourceType.AI,
      operationType: UsageOperationType.AI_CHAT_TOKEN,
      spenders: { userWorkspaceId: USER_WORKSPACE_ID },
    });
  });
});
