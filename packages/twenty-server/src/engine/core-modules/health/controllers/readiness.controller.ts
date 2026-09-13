import { Controller, Get, UseGuards } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiPath } from 'twenty-shared/types';

import { ReadinessService } from 'src/engine/core-modules/health/services/readiness.service';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

// Readiness differs from /healthz (liveness): a failing dependency must stop
// traffic routing to this instance without restarting the process.
@Controller(ApiPath.Ready)
export class ReadinessController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly readinessService: ReadinessService,
  ) {}

  @Get()
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.readinessService.checkDatabase(),
      () => this.readinessService.checkRedis(),
    ]);
  }
}
