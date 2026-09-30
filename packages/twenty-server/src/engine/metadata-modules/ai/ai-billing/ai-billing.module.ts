import { Module } from '@nestjs/common';

import { ClickHouseModule } from 'src/database/clickhouse/clickhouse.module';
import { CoreEntityCacheModule } from 'src/engine/core-entity-cache/core-entity-cache.module';
import { BillingModule } from 'src/engine/core-modules/billing/billing.module';
import { UsageModule } from 'src/engine/core-modules/usage/usage.module';
import { AiBillingService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-billing.service';
import { AiMonthlyTokenCapService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-monthly-token-cap.service';
import { AiModelsModule } from 'src/engine/metadata-modules/ai/ai-models/ai-models.module';

@Module({
  imports: [
    AiModelsModule,
    BillingModule,
    UsageModule,
    ClickHouseModule,
    CoreEntityCacheModule,
  ],
  providers: [AiBillingService, AiMonthlyTokenCapService],
  exports: [AiBillingService],
})
export class AiBillingModule {}
