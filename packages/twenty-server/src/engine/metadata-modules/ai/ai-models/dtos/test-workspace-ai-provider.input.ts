import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class TestWorkspaceAiProviderInput {
  @Field(() => String)
  provider: string;

  @Field(() => String)
  npm: string;

  // Omitted means "test the stored key".
  @Field(() => String, { nullable: true })
  apiKey?: string;

  @Field(() => String, { nullable: true })
  baseUrl?: string;

  @Field(() => String)
  model: string;
}
