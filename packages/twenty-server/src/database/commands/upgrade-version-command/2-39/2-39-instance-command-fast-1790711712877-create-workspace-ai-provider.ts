import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

// The generator also emitted pre-existing drift on documentShare /
// notification / notificationWatch (FK constraint renames and a NOT NULL drop
// caused by stale constraint names in the dev database). Those changes do not
// belong to this entity and were removed; only the workspaceAiProvider table is
// created here.
@RegisteredInstanceCommand('2.39.0', 1790711712877)
export class CreateWorkspaceAiProviderFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "core"."workspaceAiProvider" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying NOT NULL, "npm" character varying NOT NULL, "label" character varying, "encryptedApiKey" text, "baseUrl" character varying, "defaultModel" character varying, "fastModel" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "IDX_WORKSPACE_AI_PROVIDER_WORKSPACE_PROVIDER_UNIQUE" UNIQUE ("workspaceId", "provider"), CONSTRAINT "PK_dc37545e4e94f60fe18fbe6df92" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."workspaceAiProvider" ADD CONSTRAINT "FK_fc4275b7cf8d43ffc877625fceb" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."workspaceAiProvider" DROP CONSTRAINT "FK_fc4275b7cf8d43ffc877625fceb"`,
    );
    await queryRunner.query(`DROP TABLE "core"."workspaceAiProvider"`);
  }
}