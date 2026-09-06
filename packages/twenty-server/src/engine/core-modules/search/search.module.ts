import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { FileModule } from 'src/engine/core-modules/file/file.module';
import { SearchResolver } from 'src/engine/core-modules/search/search.resolver';
import { SearchProviderRegistryService } from 'src/engine/core-modules/search/services/search-provider-registry.service';
import { SearchService } from 'src/engine/core-modules/search/services/search.service';
import { ApplicationTranslationCatalogModule } from 'src/engine/metadata-modules/application-translation-catalog/application-translation-catalog.module';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';

@Module({
  imports: [
    DiscoveryModule,
    FileModule,
    WorkspaceManyOrAllFlatEntityMapsCacheModule,
    ApplicationTranslationCatalogModule,
  ],
  providers: [SearchResolver, SearchService, SearchProviderRegistryService],
})
export class SearchModule {}
