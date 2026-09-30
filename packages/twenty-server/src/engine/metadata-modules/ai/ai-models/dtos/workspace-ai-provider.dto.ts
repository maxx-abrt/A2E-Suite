import { Field, ObjectType } from '@nestjs/graphql';

import { WorkspaceAiProviderSource } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider-source.enum';

@ObjectType()
export class WorkspaceAiProviderDTO {
  @Field(() => String)
  provider: string;

  @Field(() => String, { nullable: true })
  label: string | null;

  @Field(() => String)
  npm: string;

  @Field(() => String, { nullable: true })
  baseUrl: string | null;

  // The key itself never leaves the server: only its presence and this fixed
  // placeholder travel to the client (keep the Audit tab masking intact).
  @Field(() => Boolean)
  hasApiKey: boolean;

  @Field(() => String, { nullable: true })
  maskedApiKey: string | null;

  // Catalog providers expose the config-variable NAME backing the key (never
  // its value), matching the Admin Panel behavior.
  @Field(() => String, { nullable: true })
  apiKeyConfigVariable: string | null;

  @Field(() => WorkspaceAiProviderSource)
  source: WorkspaceAiProviderSource;

  @Field(() => Boolean)
  isCatalogProvider: boolean;

  @Field(() => String, { nullable: true })
  defaultModel: string | null;

  @Field(() => String, { nullable: true })
  fastModel: string | null;

  @Field(() => [String])
  models: string[];
}

@ObjectType()
export class WorkspaceAiProvidersDTO {
  // Rendered in the page so the admin sees the live resolution order:
  // workspace BYOK → instance AI_PROVIDERS → committed catalog.
  @Field(() => [WorkspaceAiProviderSource])
  resolutionOrder: WorkspaceAiProviderSource[];

  @Field(() => [WorkspaceAiProviderDTO])
  providers: WorkspaceAiProviderDTO[];
}
