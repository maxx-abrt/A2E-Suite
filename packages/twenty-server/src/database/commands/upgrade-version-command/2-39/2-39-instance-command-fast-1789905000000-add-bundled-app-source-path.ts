import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

// Adds the `bundledAppSourcePath` column to `core.applicationRegistration`
// for the M1 BUNDLED source type (apps baked into the Docker image at build
// time — their tarball lives on the filesystem, not in file storage).
@RegisteredInstanceCommand('2.39.0', 1789905000000)
export class AddBundledAppSourcePathToApplicationRegistrationFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."applicationRegistration" ADD IF NOT EXISTS "bundledAppSourcePath" text`,
    );
    // Extend the sourceType text column to accept the new 'bundled' value.
    // The column is plain text (no enum constraint at the DB level), so no
    // enum alteration is needed — TypeORM validates at the application layer.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove bundled registrations before dropping the column so the cascade
    // cannot silently orphan installed apps that used this path.
    await queryRunner.query(
      `UPDATE "core"."applicationRegistration" SET "sourceType" = 'tarball' WHERE "sourceType" = 'bundled' AND "bundledAppSourcePath" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."applicationRegistration" DROP COLUMN IF EXISTS "bundledAppSourcePath"`,
    );
  }
}
