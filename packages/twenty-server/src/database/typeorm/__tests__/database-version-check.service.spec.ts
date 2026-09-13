import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { DatabaseVersionCheckService } from 'src/database/typeorm/database-version-check.service';

describe('DatabaseVersionCheckService', () => {
  let service: DatabaseVersionCheckService;
  const query = jest.fn();

  beforeEach(async () => {
    query.mockReset();

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseVersionCheckService,
        {
          provide: DataSource,
          useValue: { query },
        },
      ],
    }).compile();

    service = testingModule.get<DatabaseVersionCheckService>(
      DatabaseVersionCheckService,
    );
  });

  it('passes on a supported version', async () => {
    query.mockResolvedValue([[{ version: '16.9' }]]);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('rejects a version below the minimum', async () => {
    query.mockResolvedValue([[{ version: '13.20' }]]);

    await expect(service.onModuleInit()).rejects.toThrow(
      /minimum is 14/,
    );
  });

  it('propagates query failures so boot fails visibly', async () => {
    query.mockRejectedValue(new Error('database unreachable'));

    await expect(service.onModuleInit()).rejects.toThrow(
      'database unreachable',
    );
  });
});
