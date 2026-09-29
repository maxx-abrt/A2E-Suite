import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EnterpriseModule } from 'src/engine/core-modules/enterprise/enterprise.module';
import { SecretEncryptionModule } from 'src/engine/core-modules/secret-encryption/secret-encryption.module';
import { WorkspaceAiProviderEntity } from 'src/engine/metadata-modules/ai/ai-models/entities/workspace-ai-provider.entity';
import { AiModelConfigService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-config.service';
import { AiModelPreferencesService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-preferences.service';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { DefaultAiCatalogService } from 'src/engine/metadata-modules/ai/ai-models/services/default-ai-catalog.service';
import { ModelsDevCatalogService } from 'src/engine/metadata-modules/ai/ai-models/services/models-dev-catalog.service';
import { NativeToolBinderService } from 'src/engine/metadata-modules/ai/ai-models/services/native-tool-binder.service';
import { ProviderConfigService } from 'src/engine/metadata-modules/ai/ai-models/services/provider-config.service';
import { SdkProviderFactoryService } from 'src/engine/metadata-modules/ai/ai-models/services/sdk-provider-factory.service';
import { WorkspaceAiProviderService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service';
import { provideWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/provide-workspace-scoped-repository';

@Global()
@Module({
  imports: [
    EnterpriseModule,
    SecretEncryptionModule,
    TypeOrmModule.forFeature([WorkspaceAiProviderEntity]),
  ],
  providers: [
    DefaultAiCatalogService,
    ProviderConfigService,
    SdkProviderFactoryService,
    ModelsDevCatalogService,
    AiModelPreferencesService,
    AiModelRegistryService,
    AiModelConfigService,
    NativeToolBinderService,
    WorkspaceAiProviderService,
    provideWorkspaceScopedRepository(WorkspaceAiProviderEntity),
  ],
  exports: [
    DefaultAiCatalogService,
    AiModelRegistryService,
    AiModelPreferencesService,
    AiModelConfigService,
    SdkProviderFactoryService,
    ModelsDevCatalogService,
    NativeToolBinderService,
    ProviderConfigService,
    WorkspaceAiProviderService,
  ],
})
export class AiModelsModule {}
