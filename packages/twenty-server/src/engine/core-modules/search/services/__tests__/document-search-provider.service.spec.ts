import { getRegisteredSearchProviderMetadata } from 'src/engine/core-modules/search/decorators/registered-search-provider.decorator';
import { DocumentSearchProviderService } from 'src/engine/core-modules/search/services/document-search-provider.service';

// APPLICATION_UNIVERSAL_IDENTIFIER of a2e-documents; inlined because server
// tests do not resolve the twenty-apps package (same hermetic pattern as the
// sibling registry spec).
const A2E_DOCUMENTS_APP_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

describe('DocumentSearchProviderService', () => {
  it('is registered for the a2e-documents app universal identifier', () => {
    expect(
      getRegisteredSearchProviderMetadata(DocumentSearchProviderService),
    ).toMatchObject({
      appUniversalIdentifier: A2E_DOCUMENTS_APP_UNIVERSAL_IDENTIFIER,
    });
  });

  it('returns an empty result set until the document object exists (P3)', async () => {
    const provider = new DocumentSearchProviderService();

    await expect(
      provider.search({
        searchInput: 'meeting notes',
        limit: 5,
        workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
      }),
    ).resolves.toEqual({ items: [] });
  });
});
