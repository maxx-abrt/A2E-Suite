import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type DataSource } from 'typeorm';

// Server code (upgrade commands, generated columns) relies on PostgreSQL
// behaviors guaranteed only from this floor; lower majors boot but corrupt.
const MINIMUM_POSTGRES_MAJOR_VERSION = 14;

@Injectable()
export class DatabaseVersionCheckService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseVersionCheckService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    // TypeORM query() returns a flat rows array for raw SQL, and SHOW
    // server_version names its column server_version (not version).
    const [{ server_version: serverVersion }] = (await this.dataSource.query(
      'SHOW server_version',
    )) as [{ server_version: string }];

    const majorVersion = parseInt(serverVersion.split('.')[0] ?? '0', 10);

    if (majorVersion < MINIMUM_POSTGRES_MAJOR_VERSION) {
      throw new Error(
        `PostgreSQL ${serverVersion} is not supported: the minimum is ${MINIMUM_POSTGRES_MAJOR_VERSION}. ` +
          'Upgrade the database before running the server.',
      );
    }

    this.logger.log(`PostgreSQL ${serverVersion} — supported version`);
  }
}
