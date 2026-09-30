import { Field, ObjectType } from '@nestjs/graphql';

import { WorkspaceAiProviderTestErrorCode } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider-test-error-code.enum';

@ObjectType()
export class WorkspaceAiProviderTestResultDTO {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => WorkspaceAiProviderTestErrorCode, { nullable: true })
  errorCode: WorkspaceAiProviderTestErrorCode | null;

  // Safe, provider-error-message-free summary; the front renders its own
  // localized copy from errorCode.
  @Field(() => String, { nullable: true })
  message: string | null;

  @Field(() => String)
  model: string;
}
