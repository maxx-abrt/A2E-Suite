import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';

import { RegisteredSearchProvider } from 'src/engine/core-modules/search/decorators/registered-search-provider.decorator';
import { SearchProviderRegistryService } from 'src/engine/core-modules/search/services/search-provider-registry.service';
import { type SearchProvider } from 'src/engine/core-modules/search/types/search-provider.type';

const APP_UNIVERSAL_IDENTIFIER = '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

const buildSearchProvider = (recordId: string): SearchProvider => ({
  search: async ({ searchInput }) => ({
    items: [
      {
        recordId,
        label: `result for ${searchInput}`,
        path: '/object/document/record-id',
      },
    ],
  }),
});

@RegisteredSearchProvider({
  appUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
})
class ExampleDocumentSearchProvider implements SearchProvider {
  async search() {
    return { items: [] };
  }
}

describe('SearchProviderRegistryService', () => {
  let service: SearchProviderRegistryService;
  let discoveryService: DiscoveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [SearchProviderRegistryService, ExampleDocumentSearchProvider],
    }).compile();

    service = module.get<SearchProviderRegistryService>(
      SearchProviderRegistryService,
    );
    discoveryService = module.get<DiscoveryService>(DiscoveryService);

    // onModuleInit is not auto-run outside the app bootstrap.
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('discovers decorated providers keyed by app universal identifier', () => {
    const registered = service.getSearchProvidersByAppUniversalIdentifier(
      APP_UNIVERSAL_IDENTIFIER,
    );

    expect(registered).toHaveLength(1);
    expect(registered[0].appUniversalIdentifier).toBe(APP_UNIVERSAL_IDENTIFIER);
    expect(registered[0].provider).toBeInstanceOf(
      ExampleDocumentSearchProvider,
    );
  });

  it('returns an empty list for unknown apps', () => {
    expect(
      service.getSearchProvidersByAppUniversalIdentifier('unknown-app'),
    ).toEqual([]);
  });

  it('exposes every registered provider', () => {
    expect(service.getAllSearchProviders()).toHaveLength(1);
    expect(discoveryService.getProviders().length).toBeGreaterThan(0);
  });

  it('delegates search to the registered provider', async () => {
    const provider = buildSearchProvider('record-1');

    const result = await provider.search({
      searchInput: 'invoice',
      limit: 5,
      workspaceId: 'workspace-id',
    });

    expect(result.items[0].label).toBe('result for invoice');
    expect(result.items[0].path).toBe('/object/document/record-id');
  });
});
