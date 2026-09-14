import { Field, InputType, Int } from '@nestjs/graphql';

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';

@InputType()
export class ApplyWorkspaceTemplateInput {
  @IsEnum(WorkspaceTemplate)
  @Field(() => WorkspaceTemplate)
  template: WorkspaceTemplate;
}

@InputType()
export class ApplyWorkspaceTemplateOperationInput {
  @IsUUID()
  @Field(() => String, {
    description:
      'Client-generated idempotency key: retrying with the same key resumes the same operation instead of duplicating seeds',
  })
  idempotencyKey: string;

  @IsEnum(WorkspaceTemplate)
  @Field(() => WorkspaceTemplate)
  template: WorkspaceTemplate;

  // Optimistic concurrency against the previewed definition version.
  @IsOptional()
  @Field(() => Int, { nullable: true })
  templateVersion?: number;

  // Optional apps the user chose to exclude; required apps cannot be listed.
  @IsOptional()
  @IsArray()
  @Field(() => [String], { nullable: true })
  deselectedOptionalAppUniversalIdentifiers?: string[];

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  sampleContentEnabled?: boolean;
}
