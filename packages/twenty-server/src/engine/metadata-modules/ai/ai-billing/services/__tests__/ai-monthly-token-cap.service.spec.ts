import { Test, type TestingModule } from '@nestjs/testing';

import { ClickHouseService } from 'src/database/clickhouse/clickhouse.service';
import { CoreEntityCacheService } from 'src/engine/core-entity-cache/services/core-entity-cache.service';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';
import { AiMonthlyTokenCapService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-monthly-token-cap.service';

const WORKSPACE_ID = 'workspace-1';

describe('AiMonthlyTokenCapService', () => {
  let service: AiMonthlyTokenCapService;
  let getWorkspace: jest.Mock;
  let select: jest.Mock;

  beforeEach(async () => {
    getWorkspace = jest.fn();
    select = jest.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMonthlyTokenCapService,
        {
          provide: CoreEntityCacheService,
          useValue: { get: getWorkspace },
        },
        {
          provide: ClickHouseService,
          useValue: { select },
        },
      ],
    }).compile();

    service = module.get<AiMonthlyTokenCapService>(AiMonthlyTokenCapService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does nothing and reads no usage when no cap is configured', async () => {
    getWorkspace.mockResolvedValue({ aiMonthlyTokenCap: null });

    await expect(
      service.assertWithinMonthlyTokenCap({
        workspaceId: WORKSPACE_ID,
        operationType: UsageOperationType.AI_CHAT_TOKEN,
      }),
    ).resolves.toBeUndefined();
    expect(select).not.toHaveBeenCalled();
  });

  it('does nothing when no usage has been recorded (count-0 no-op)', async () => {
    getWorkspace.mockResolvedValue({ aiMonthlyTokenCap: 1_000 });
    select.mockResolvedValue([{ total: 0 }]);

    await expect(
      service.assertWithinMonthlyTokenCap({
        workspaceId: WORKSPACE_ID,
        operationType: UsageOperationType.AI_CHAT_TOKEN,
      }),
    ).resolves.toBeUndefined();
  });

  it('allows usage below the cap', async () => {
    getWorkspace.mockResolvedValue({ aiMonthlyTokenCap: 1_000 });
    select.mockResolvedValue([{ total: '999' }]);

    await expect(
      service.assertWithinMonthlyTokenCap({
        workspaceId: WORKSPACE_ID,
        operationType: UsageOperationType.WEB_SEARCH,
      }),
    ).resolves.toBeUndefined();
  });

  it('throws a typed refusal once the cap is reached', async () => {
    getWorkspace.mockResolvedValue({ aiMonthlyTokenCap: 1_000 });
    select.mockResolvedValue([{ total: 1_000 }]);

    await expect(
      service.assertWithinMonthlyTokenCap({
        workspaceId: WORKSPACE_ID,
        operationType: UsageOperationType.AI_CHAT_TOKEN,
      }),
    ).rejects.toMatchObject({
      code: AiExceptionCode.MONTHLY_TOKEN_CAP_EXCEEDED,
    });

    await expect(
      service.assertWithinMonthlyTokenCap({
        workspaceId: WORKSPACE_ID,
        operationType: UsageOperationType.AI_CHAT_TOKEN,
      }),
    ).rejects.toBeInstanceOf(AiException);
  });

  it('leaves unmetered AI operations untouched', async () => {
    getWorkspace.mockResolvedValue({ aiMonthlyTokenCap: 1 });

    await expect(
      service.assertWithinMonthlyTokenCap({
        workspaceId: WORKSPACE_ID,
        operationType: UsageOperationType.AI_WORKFLOW_TOKEN,
      }),
    ).resolves.toBeUndefined();
    expect(getWorkspace).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it('fails open when the usage read is empty', async () => {
    getWorkspace.mockResolvedValue({ aiMonthlyTokenCap: 1_000 });
    select.mockResolvedValue([]);

    const usedTokens = await service.getMonthlyTokenUsage({
      workspaceId: WORKSPACE_ID,
    });

    expect(usedTokens).toBe(0);
  });

  it('reads only the capped AI operations for the current UTC month', async () => {
    getWorkspace.mockResolvedValue({ aiMonthlyTokenCap: 1_000 });
    select.mockResolvedValue([{ total: 42 }]);

    await service.assertWithinMonthlyTokenCap({
      workspaceId: WORKSPACE_ID,
      operationType: UsageOperationType.AI_CHAT_TOKEN,
    });

    const [query, params] = select.mock.calls[0];

    expect(query).toContain("operationType IN ('AI_CHAT_TOKEN', 'WEB_SEARCH')");
    expect(params.workspaceId).toBe(WORKSPACE_ID);
    expect(params.resourceType).toBe('AI');
  });
});
