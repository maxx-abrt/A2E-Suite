import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.39.0', 1789062772757)
export class AddDocumentShareEntityFastInstanceCommand implements FastInstanceCommand {
  // titleSnapshot is NOT NULL because every share is created from a live
  // document the author was looking at; snapshots may stay empty strings.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "core"."documentShare" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shareToken" character varying NOT NULL, "documentRecordId" uuid NOT NULL, "titleSnapshot" text NOT NULL, "bodySnapshot" text, "encryptedBody" text, "bodyIv" character varying, "bodySalt" character varying, "expiresAt" TIMESTAMP WITH TIME ZONE, "createdByUserId" uuid, "workspaceId" uuid NOT NULL, CONSTRAINT "UQ_document_share_token" UNIQUE ("shareToken"), CONSTRAINT "PK_document_share" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_DOCUMENT_SHARE_TOKEN" ON "core"."documentShare" ("shareToken")`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."documentShare" ADD CONSTRAINT "FK_document_share_workspace" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."documentShare" DROP CONSTRAINT "FK_document_share_workspace"`,
    );
    await queryRunner.query(`DROP INDEX "core"."IDX_DOCUMENT_SHARE_TOKEN"`);
    await queryRunner.query(`DROP TABLE "core"."documentShare"`);
  }
}
