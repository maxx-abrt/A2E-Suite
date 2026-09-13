import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { TypeORMModule } from 'src/database/typeorm/typeorm.module';
import { HealthController } from 'src/engine/core-modules/health/controllers/health.controller';
import { ReadinessController } from 'src/engine/core-modules/health/controllers/readiness.controller';
import { ReadinessService } from 'src/engine/core-modules/health/services/readiness.service';

@Module({
  // TypeORMModule guarantees the core DataSource exists even if the health
  // module is mounted in a context (queue worker) that has no other DB consumer.
  imports: [TerminusModule, TypeORMModule],
  controllers: [HealthController, ReadinessController],
  providers: [ReadinessService],
  exports: [ReadinessService],
})
export class HealthModule {}
