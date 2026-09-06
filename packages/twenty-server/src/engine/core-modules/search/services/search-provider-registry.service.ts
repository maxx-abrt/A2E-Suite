import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import { isDefined } from 'twenty-shared/utils';

import { getRegisteredSearchProviderMetadata } from 'src/engine/core-modules/search/decorators/registered-search-provider.decorator';
import { type SearchProvider } from 'src/engine/core-modules/search/types/search-provider.type';

export type RegisteredSearchProvider = {
  appUniversalIdentifier: string;
  provider: SearchProvider;
};

@Injectable()
export class SearchProviderRegistryService implements OnModuleInit {
  private readonly logger = new Logger(SearchProviderRegistryService.name);

  // Keyed by app universal identifier; an app contributes at most one
  // provider today, but the array keeps the door open for several.
  private readonly providersByAppUniversalIdentifier = new Map<
    string,
    RegisteredSearchProvider[]
  >();

  constructor(private readonly discoveryService: DiscoveryService) {}

  onModuleInit(): void {
    for (const wrapper of this.discoveryService.getProviders()) {
      const { instance, metatype } = wrapper;

      if (!isDefined(instance) || !isDefined(metatype)) {
        continue;
      }

      const metadata = getRegisteredSearchProviderMetadata(metatype);

      if (!isDefined(metadata)) {
        continue;
      }

      const registered = this.providersByAppUniversalIdentifier.get(
        metadata.appUniversalIdentifier,
      );

      const entry: RegisteredSearchProvider = {
        appUniversalIdentifier: metadata.appUniversalIdentifier,
        provider: instance as SearchProvider,
      };

      if (isDefined(registered)) {
        registered.push(entry);
      } else {
        this.providersByAppUniversalIdentifier.set(
          metadata.appUniversalIdentifier,
          [entry],
        );
      }

      this.logger.log(
        `Registered search provider for app ${metadata.appUniversalIdentifier}`,
      );
    }
  }

  getSearchProvidersByAppUniversalIdentifier(
    appUniversalIdentifier: string,
  ): RegisteredSearchProvider[] {
    return (
      this.providersByAppUniversalIdentifier.get(appUniversalIdentifier) ?? []
    );
  }

  getAllSearchProviders(): RegisteredSearchProvider[] {
    return [...this.providersByAppUniversalIdentifier.values()].flat();
  }
}
