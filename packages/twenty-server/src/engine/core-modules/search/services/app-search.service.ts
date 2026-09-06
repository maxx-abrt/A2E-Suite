import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type AppSearchRecordDTO } from 'src/engine/core-modules/search/dtos/app-search-record.dto';
import { type AppSearchResultGroupDTO } from 'src/engine/core-modules/search/dtos/app-search-result-group.dto';
import { SearchProviderRegistryService } from 'src/engine/core-modules/search/services/search-provider-registry.service';
import { type SearchProviderResultItem } from 'src/engine/core-modules/search/types/search-provider.type';

const MAX_RECORDS_PER_APP = 5;

@Injectable()
export class AppSearchService {
  private readonly logger = new Logger(AppSearchService.name);

  constructor(
    private readonly searchProviderRegistryService: SearchProviderRegistryService,
  ) {}

  // Only providers whose app is installed in the workspace run; an
  // uninstalled app keeps no application row, so the id map is the gate.
  async searchInstalledAppRecords({
    searchInput,
    workspaceId,
    installedAppUniversalIdentifiers,
  }: {
    searchInput: string;
    workspaceId: string;
    installedAppUniversalIdentifiers: string[];
  }): Promise<AppSearchResultGroupDTO[]> {
    const installedIdentifiers = new Set(installedAppUniversalIdentifiers);

    const registeredProviders = this.searchProviderRegistryService
      .getAllSearchProviders()
      .filter(({ appUniversalIdentifier }) =>
        installedIdentifiers.has(appUniversalIdentifier),
      );

    const groups = await Promise.all(
      registeredProviders.map(
        async ({
          appUniversalIdentifier,
          provider,
        }): Promise<AppSearchResultGroupDTO | null> => {
          try {
            const { items } = await provider.search({
              searchInput,
              limit: MAX_RECORDS_PER_APP,
              workspaceId,
            });

            const records = items.map(
              (item: SearchProviderResultItem): AppSearchRecordDTO => ({
                recordId: item.recordId,
                label: item.label,
                description: item.description,
                imageUrl: item.imageUrl,
                path: item.path,
              }),
            );

            return records.length > 0
              ? { appUniversalIdentifier, records }
              : null;
          } catch (error) {
            // One broken provider must not break the whole search payload.
            this.logger.error(
              `Search provider for app ${appUniversalIdentifier} failed: ${error instanceof Error ? error.message : String(error)}`,
            );

            return null;
          }
        },
      ),
    );

    return groups.filter(isDefined);
  }
}
