import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

const WIDGET_TYPES_BEFORE =
  "'VIEW', 'IFRAME', 'FIELD', 'FIELDS', 'GRAPH', 'STANDALONE_RICH_TEXT', 'TIMELINE', 'TASKS', 'NOTES', 'FILES', 'EMAILS', 'CALENDAR', 'FIELD_RICH_TEXT', 'WORKFLOW', 'WORKFLOW_VERSION', 'WORKFLOW_RUN', 'FRONT_COMPONENT', 'RECORD_TABLE', 'EMAIL_THREAD', 'CALL_RECORDING_SUMMARY', 'CALL_RECORDING_TRANSCRIPT', 'MESSAGE_CAMPAIGN_BODY', 'MESSAGE_CAMPAIGN_DETAILS', 'FORM_FIELD'";
const WIDGET_TYPES_AFTER = `${WIDGET_TYPES_BEFORE}, 'DISCUSSIONS'`;

@RegisteredInstanceCommand('2.39.0', 1789800000000)
export class AddDiscussionsWidgetTypeFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceWidgetTypeEnum(queryRunner, WIDGET_TYPES_AFTER);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "core"."pageLayoutWidget" WHERE "type" = 'DISCUSSIONS'`,
    );

    await this.replaceWidgetTypeEnum(queryRunner, WIDGET_TYPES_BEFORE);
  }

  private async replaceWidgetTypeEnum(
    queryRunner: QueryRunner,
    enumValues: string,
  ): Promise<void> {
    await queryRunner.query(
      'ALTER TYPE "core"."pageLayoutWidget_type_enum" RENAME TO "pageLayoutWidget_type_enum_old"',
    );
    await queryRunner.query(
      `CREATE TYPE "core"."pageLayoutWidget_type_enum" AS ENUM(${enumValues})`,
    );
    await queryRunner.query(
      'ALTER TABLE "core"."pageLayoutWidget" ALTER COLUMN "type" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."pageLayoutWidget" ALTER COLUMN "type" TYPE "core"."pageLayoutWidget_type_enum" USING "type"::"text"::"core"."pageLayoutWidget_type_enum"',
    );
    await queryRunner.query(
      `ALTER TABLE "core"."pageLayoutWidget" ALTER COLUMN "type" SET DEFAULT 'VIEW'`,
    );
    await queryRunner.query('DROP TYPE "core"."pageLayoutWidget_type_enum_old"');
  }
}
