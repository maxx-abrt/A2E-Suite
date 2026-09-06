import { Field, InputType } from '@nestjs/graphql';

import { IsEnum } from 'class-validator';

import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';

@InputType()
export class ApplyWorkspaceTemplateInput {
  @IsEnum(WorkspaceTemplate)
  @Field(() => WorkspaceTemplate)
  template: WorkspaceTemplate;
}
