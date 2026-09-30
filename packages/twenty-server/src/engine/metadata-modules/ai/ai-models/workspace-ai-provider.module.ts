import { Module } from '@nestjs/common';

import { AiGraphqlApiExceptionInterceptor } from 'src/engine/metadata-modules/ai/interceptors/ai-graphql-api-exception.interceptor';
import { AiModelsModule } from 'src/engine/metadata-modules/ai/ai-models/ai-models.module';
import { WorkspaceAiProviderResolver } from 'src/engine/metadata-modules/ai/ai-models/resolvers/workspace-ai-provider.resolver';
import { WorkspaceAiProviderAdminService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider-admin.service';

@Module({
  imports: [AiModelsModule],
  providers: [
    WorkspaceAiProviderResolver,
    WorkspaceAiProviderAdminService,
    AiGraphqlApiExceptionInterceptor,
  ],
})
export class WorkspaceAiProviderModule {}
