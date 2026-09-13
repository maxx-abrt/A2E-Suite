import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { type DataSource } from 'typeorm';

import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { withDeadline } from 'src/utils/with-deadline';

const READINESS_CHECK_TIMEOUT_MS = 3000;

type CheckOutcome = { ok: true } | { ok: false; error: unknown };

@Injectable()
export class ReadinessService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redisClientService: RedisClientService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  // Terminus treats a thrown error as an unknown failure and returns HTTP 500;
  // a probe must get a deterministic 503 with a per-dependency status instead,
  // so every failure is captured and reported through indicator.down().
  async checkDatabase(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('database');
    const outcome = await this.runWithDeadline(
      this.dataSource.query('SELECT 1'),
    );

    return outcome.ok
      ? indicator.up()
      : indicator.down({ message: toErrorMessage(outcome.error) });
  }

  async checkRedis(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('redis');
    const outcome = await this.runWithDeadline(
      this.redisClientService.getClient().ping(),
    );

    return outcome.ok
      ? indicator.up()
      : indicator.down({ message: toErrorMessage(outcome.error) });
  }

  async isReady(): Promise<boolean> {
    const [database, redis] = await Promise.all([
      this.runWithDeadline(this.dataSource.query('SELECT 1')),
      this.runWithDeadline(this.redisClientService.getClient().ping()),
    ]);

    return database.ok && redis.ok;
  }

  private runWithDeadline<TData>(
    promise: Promise<TData>,
  ): Promise<CheckOutcome> {
    return withDeadline({
      promise,
      timeoutMs: READINESS_CHECK_TIMEOUT_MS,
      createTimeoutError: () =>
        new Error(`Readiness check timed out after ${READINESS_CHECK_TIMEOUT_MS}ms`),
    }).then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ ok: false as const, error }),
    );
  }
}

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Dependency is unreachable';
