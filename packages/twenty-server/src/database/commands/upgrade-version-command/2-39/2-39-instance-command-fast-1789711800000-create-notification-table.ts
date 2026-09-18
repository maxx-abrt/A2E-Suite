import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

// Creates core."notification" backing NotificationEntity. Hand-written (not
// generator output) because the entity only adds a table plus two lookup
// indexes; constraint names are explicit so a later migrate:generate sees no
// spurious diff.
@RegisteredInstanceCommand('2.39.0', 1789711800000)
export class CreateNotificationTableFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "core"."notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workspaceId" uuid NOT NULL, "userId" uuid NOT NULL, "type" character varying NOT NULL, "payload" jsonb, "readAt" TIMESTAMP WITH TIME ZONE, "archivedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_notification" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."notification" ADD CONSTRAINT "FK_notification_workspace" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_NOTIFICATION_USER_ID_WORKSPACE_ID_CREATED_AT" ON "core"."notification" ("userId", "workspaceId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_NOTIFICATION_USER_ID_WORKSPACE_ID_READ_AT" ON "core"."notification" ("userId", "workspaceId", "readAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "core"."IDX_NOTIFICATION_USER_ID_WORKSPACE_ID_READ_AT"`,
    );
    await queryRunner.query(
      `DROP INDEX "core"."IDX_NOTIFICATION_USER_ID_WORKSPACE_ID_CREATED_AT"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."notification" DROP CONSTRAINT "FK_notification_workspace"`,
    );
    await queryRunner.query(`DROP TABLE "core"."notification"`);
  }
}
