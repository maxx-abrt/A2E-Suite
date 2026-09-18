import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

// Creates core."notificationWatch" backing NotificationWatchEntity. Hand-written
// (not generator output) to mirror the committed notification/documentShare
// commands; constraint names are explicit so a later migrate:generate sees no
// spurious diff.
@RegisteredInstanceCommand('2.39.0', 1789900000000)
export class CreateNotificationWatchTableFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "core"."notificationWatch" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workspaceId" uuid NOT NULL, "userId" uuid NOT NULL, "targetKind" character varying NOT NULL, "targetId" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_notificationWatch" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."notificationWatch" ADD CONSTRAINT "FK_notificationWatch_workspace" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_NOTIFICATION_WATCH_USER_ID_TARGET" ON "core"."notificationWatch" ("userId", "workspaceId", "targetKind", "targetId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "core"."IDX_NOTIFICATION_WATCH_USER_ID_TARGET"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."notificationWatch" DROP CONSTRAINT "FK_notificationWatch_workspace"`,
    );
    await queryRunner.query(`DROP TABLE "core"."notificationWatch"`);
  }
}
