import { AppSearchService } from 'src/engine/core-modules/search/services/app-search.service';
import { type SearchProvider } from 'src/engine/core-modules/search/types/search-provider.type';

const buildProvider = (items: Array<Record<string, unknown>>): SearchProvider =>
  ({
    search: jest.fn().mockResolvedValue({ items }),
  }) as unknown as SearchProvider;

const APP_A = '11111111-1111-4111-8111-111111111111';
const APP_B = '22222222-2222-4222-8222-222222222222';
const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

describe('AppSearchService', () => {
  const buildService = (
    providers: Array<{
      appUniversalIdentifier: string;
      provider: SearchProvider;
    }>,
  ) => {
    const searchProviderRegistryService = {
      getAllSearchProviders: jest.fn().mockReturnValue(providers),
    } as never;

    return new AppSearchService(searchProviderRegistryService);
  };

  it('runs only providers of installed apps', async () => {
    const service = buildService([
      { appUniversalIdentifier: APP_A, provider: buildProvider([]) },
      { appUniversalIdentifier: APP_B, provider: buildProvider([]) },
    ]);

    const result = await service.searchInstalledAppRecords({
      searchInput: 'foo',
      workspaceId: WORKSPACE_ID,
      installedAppUniversalIdentifiers: [APP_A],
    });

    expect(result).toEqual([]);
    expect(
      (
        service as never as {
          searchProviderRegistryService: { getAllSearchProviders: jest.Mock };
        }
      ).searchProviderRegistryService.getAllSearchProviders,
    ).toHaveBeenCalledTimes(1);
  });

  // Install gate is keyed by app universal identifier: a provider belonging to
  // an app that is not installed in this workspace must contribute nothing and
  // must not even be queried, so no title from an uninstalled app can leak into
  // the federated payload.
  it('contributes no result from an uninstalled app and never queries its provider', async () => {
    const uninstalledProvider = buildProvider([
      {
        recordId: 'record-secret',
        label: 'Title from an uninstalled app',
        path: '/object/secret/record-secret',
      },
    ]);

    const service = buildService([
      { appUniversalIdentifier: APP_A, provider: buildProvider([]) },
      { appUniversalIdentifier: APP_B, provider: uninstalledProvider },
    ]);

    const result = await service.searchInstalledAppRecords({
      searchInput: 'title',
      workspaceId: WORKSPACE_ID,
      installedAppUniversalIdentifiers: [APP_A],
    });

    expect(result).toEqual([]);
    expect(uninstalledProvider.search).not.toHaveBeenCalled();
  });

  it('returns groups only for apps that produced items', async () => {
    const service = buildService([
      {
        appUniversalIdentifier: APP_A,
        provider: buildProvider([
          {
            recordId: 'record-1',
            label: 'First',
            description: 'Description',
            path: '/object/doc/record-1',
          },
        ]),
      },
      { appUniversalIdentifier: APP_B, provider: buildProvider([]) },
    ]);

    const result = await service.searchInstalledAppRecords({
      searchInput: 'first',
      workspaceId: WORKSPACE_ID,
      installedAppUniversalIdentifiers: [APP_A, APP_B],
    });

    expect(result).toHaveLength(1);
    expect(result[0].appUniversalIdentifier).toBe(APP_A);
    expect(result[0].records[0]).toMatchObject({
      recordId: 'record-1',
      label: 'First',
      path: '/object/doc/record-1',
    });
  });

  it('isolates a failing provider instead of rejecting', async () => {
    const failingProvider = {
      search: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as SearchProvider;

    const service = buildService([
      { appUniversalIdentifier: APP_A, provider: failingProvider },
      {
        appUniversalIdentifier: APP_B,
        provider: buildProvider([
          { recordId: 'record-2', label: 'Second', path: '/x/record-2' },
        ]),
      },
    ]);

    const result = await service.searchInstalledAppRecords({
      searchInput: 'second',
      workspaceId: WORKSPACE_ID,
      installedAppUniversalIdentifiers: [APP_A, APP_B],
    });

    expect(result).toHaveLength(1);
    expect(result[0].appUniversalIdentifier).toBe(APP_B);
  });

  it('forwards searchInput, limit and workspaceId to providers', async () => {
    const provider = buildProvider([]);
    const service = buildService([{ appUniversalIdentifier: APP_A, provider }]);

    await service.searchInstalledAppRecords({
      searchInput: 'invoice',
      workspaceId: WORKSPACE_ID,
      installedAppUniversalIdentifiers: [APP_A],
    });

    expect(provider.search).toHaveBeenCalledWith({
      searchInput: 'invoice',
      limit: 5,
      workspaceId: WORKSPACE_ID,
    });
  });
});
