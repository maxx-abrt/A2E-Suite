import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpsertWorkspaceAiProviderInput {
  @Field(() => String)
  provider: string;

  @Field(() => String)
  npm: string;

  @Field(() => String, { nullable: true })
  label?: string;

  // Omitted means "keep the stored key"; a rejected update must never erase it.
  @Field(() => String, { nullable: true })
  apiKey?: string;

  @Field(() => String, { nullable: true })
  baseUrl?: string;

  @Field(() => String, { nullable: true })
  defaultModel?: string;

  @Field(() => String, { nullable: true })
  fastModel?: string;
}
