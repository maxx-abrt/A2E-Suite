import { HealthIndicatorService } from '@nestjs/terminus';
import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { ReadinessService } from 'src/engine/core-modules/health/services/readiness.service';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

describe('ReadinessService', () => {
  let readinessService: ReadinessService;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;
  let redisClient: { ping: jest.Mock };
  // Terminus sessions key the result under the indicator name passed to check()
  let indicatorSessions: Record<string, { up: jest.Mock; down: jest.Mock }>;

  const getSession = (key: string) => {
    indicatorSessions[key] ??= {
      up: jest
        .fn()
        .mockImplementation((data?: Record<string, unknown>) => ({
          [key]: { status: 'up', ...data },
        })),
      down: jest
        .fn()
        .mockImplementation((data?: Record<string, unknown>) => ({
          [key]: { status: 'down', ...data },
        })),
    };

    return indicatorSessions[key];
  };

  beforeEach(async () => {
    dataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    redisClient = { ping: jest.fn().mockResolvedValue('PONG') };
    indicatorSessions = {};

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        ReadinessService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: RedisClientService,
          useValue: { getClient: () => redisClient },
        },
        {
          provide: HealthIndicatorService,
          useValue: { check: jest.fn((key: string) => getSession(key)) },
        },
      ],
    }).compile();

    readinessService = testingModule.get<ReadinessService>(ReadinessService);
  });

  it('reports database up when the query succeeds', async () => {
    const result = await readinessService.checkDatabase();

    expect(getSession('database').up).toHaveBeenCalled();
    expect(result).toMatchObject({ database: { status: 'up' } });
  });

  it('reports database down without throwing when the query fails', async () => {
    dataSource.query.mockRejectedValue(new Error('connection refused'));

    const result = await readinessService.checkDatabase();

    expect(getSession('database').down).toHaveBeenCalledWith({
      message: 'connection refused',
    });
    expect(result).toMatchObject({
      database: { status: 'down', message: 'connection refused' },
    });
  });

  it('reports redis up when ping succeeds', async () => {
    const result = await readinessService.checkRedis();

    expect(getSession('redis').up).toHaveBeenCalled();
    expect(result).toMatchObject({ redis: { status: 'up' } });
  });

  it('reports redis down without throwing when ping fails', async () => {
    redisClient.ping.mockRejectedValue(new Error('redis down'));

    const result = await readinessService.checkRedis();

    expect(getSession('redis').down).toHaveBeenCalledWith({
      message: 'redis down',
    });
    expect(result).toMatchObject({
      redis: { status: 'down', message: 'redis down' },
    });
  });

  it('isReady is true only when both dependencies answer', async () => {
    expect(await readinessService.isReady()).toBe(true);

    redisClient.ping.mockRejectedValue(new Error('redis down'));

    expect(await readinessService.isReady()).toBe(false);
  });

  it('isReady is false when a dependency times out', async () => {
    jest.useFakeTimers();

    dataSource.query.mockReturnValue(new Promise(() => {}));

    const pending = readinessService.isReady();
    const assertion = expect(pending).resolves.toBe(false);

    jest.advanceTimersByTime(3001);
    await assertion;
    jest.useRealTimers();
  });
});
