import { getRegisteredSearchProviderMetadata } from 'src/engine/core-modules/search/decorators/registered-search-provider.decorator';
import { DocumentSearchProviderService } from 'src/engine/core-modules/search/services/document-search-provider.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

// APPLICATION_UNIVERSAL_IDENTIFIER of a2e-documents; inlined because server
// tests do not resolve the twenty-apps package (same hermetic pattern as the
// sibling registry spec).
const A2E_DOCUMENTS_APP_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

const documentRecord = (id: string, title: string) => ({ id, title });

const buildOrmManagerMock = (
  records: { id: string; title: string }[],
): WorkspaceOrmManager =>
  ({
    executeInWorkspaceContext: (fn: () => Promise<unknown>) => fn(),
    getRepository: () => ({
      find: jest.fn().mockResolvedValue(records),
    }),
  }) as unknown as WorkspaceOrmManager;

describe('DocumentSearchProviderService', () => {
  it('is registered for the a2e-documents app universal identifier', () => {
    expect(
      getRegisteredSearchProviderMetadata(DocumentSearchProviderService),
    ).toMatchObject({
      appUniversalIdentifier: A2E_DOCUMENTS_APP_UNIVERSAL_IDENTIFIER,
    });
  });

  it('returns no items for a blank search input without querying', async () => {
    const ormManagerMock = buildOrmManagerMock([]);
    const provider = new DocumentSearchProviderService(ormManagerMock);

    await expect(
      provider.search({
        searchInput: '   ',
        limit: 5,
        workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
      }),
    ).resolves.toEqual({ items: [] });
  });

  it('maps non-archived documents to record-show deep links', async () => {
    const ormManagerMock = buildOrmManagerMock([
      documentRecord('doc-1', 'Notes de réunion'),
    ]);
    const provider = new DocumentSearchProviderService(ormManagerMock);

    await expect(
      provider.search({
        searchInput: 'réunion',
        limit: 5,
        workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
      }),
    ).resolves.toEqual({
      items: [
        {
          recordId: 'doc-1',
          label: 'Notes de réunion',
          description: 'Document',
          path: '/object/documents/doc-1',
        },
      ],
    });
  });
});
