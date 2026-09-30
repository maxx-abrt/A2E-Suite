import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { ClickHouseService } from 'src/database/clickhouse/clickhouse.service';
import { formatDateTimeForClickHouse } from 'src/database/clickhouse/utils/format-date-time-for-clickhouse.util';
import { CoreEntityCacheService } from 'src/engine/core-entity-cache/services/core-entity-cache.service';
import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';
import { isMonthlyTokenCapExceeded } from 'src/engine/metadata-modules/ai/ai-billing/utils/is-monthly-token-cap-exceeded.util';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { UsageResourceType } from 'src/engine/core-modules/usage/enums/usage-resource-type.enum';

type UsageQuantitySumRow = {
  total: string | number | null;
};

const CAPPED_OPERATION_TYPES = [
  UsageOperationType.AI_CHAT_TOKEN,
  UsageOperationType.WEB_SEARCH,
];

@Injectable()
export class AiMonthlyTokenCapService {
  private readonly logger = new Logger(AiMonthlyTokenCapService.name);

  constructor(
    private readonly coreEntityCacheService: CoreEntityCacheService,
    private readonly clickHouseService: ClickHouseService,
  ) {}

  async assertWithinMonthlyTokenCap({
    workspaceId,
    operationType,
  }: {
    workspaceId: string;
    operationType: UsageOperationType;
  }): Promise<void> {
    // The cap is measured on chat/search token rows, so only those operations
    // are refused. Gating an unmetered operation (e.g. workflow tokens) would
    // block AI work the cap never counted.
    if (!CAPPED_OPERATION_TYPES.includes(operationType)) {
      return;
    }

    const capTokens = await this.getMonthlyTokenCap(workspaceId);

    if (!isDefined(capTokens) || capTokens <= 0) {
      return;
    }

    const usedTokens = await this.getMonthlyTokenUsage({ workspaceId });

    if (!isMonthlyTokenCapExceeded({ usedTokens, capTokens })) {
      return;
    }

    throw new AiException(
      `Workspace ${workspaceId} reached its monthly AI token cap (${usedTokens}/${capTokens})`,
      AiExceptionCode.MONTHLY_TOKEN_CAP_EXCEEDED,
    );
  }

  async getMonthlyTokenCap(workspaceId: string): Promise<number | null> {
    const workspace = await this.coreEntityCacheService.get(
      'workspaceEntity',
      workspaceId,
    );

    return isDefined(workspace) ? workspace.aiMonthlyTokenCap : null;
  }

  // Reads the P9.1 event-logs usage (AI_CHAT_TOKEN / WEB_SEARCH quantity) for
  // the current UTC calendar month. ClickHouse reads fail open: an unreadable
  // total must never block a workspace, so an empty result means zero usage.
  async getMonthlyTokenUsage({
    workspaceId,
    now = new Date(),
  }: {
    workspaceId: string;
    now?: Date;
  }): Promise<number> {
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    // Operation types are server constants, so inlining them cannot be injected.
    const cappedOperationTypesSql = CAPPED_OPERATION_TYPES.map(
      (operationType) => `'${operationType}'`,
    ).join(', ');

    const rows = await this.clickHouseService.select<UsageQuantitySumRow>(
      `SELECT sum(quantity) AS total
       FROM usageEvent
       WHERE workspaceId = {workspaceId:String}
         AND resourceType = {resourceType:String}
         AND operationType IN (${cappedOperationTypesSql})
         AND timestamp >= {periodStart:DateTime64(3)}
         AND timestamp < {periodEnd:DateTime64(3)}`,
      {
        workspaceId,
        resourceType: UsageResourceType.AI,
        periodStart: formatDateTimeForClickHouse(periodStart),
        periodEnd: formatDateTimeForClickHouse(periodEnd),
      },
    );

    const rawTotal = rows[0]?.total ?? 0;
    const total = typeof rawTotal === 'string' ? Number(rawTotal) : rawTotal;

    if (!Number.isFinite(total)) {
      this.logger.error(
        `Unreadable monthly AI token usage for workspace ${workspaceId}; treating it as 0`,
      );

      return 0;
    }

    return total;
  }
}
