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
): { ormManager: WorkspaceOrmManager; repositoryFind: jest.Mock } => {
  const repositoryFind = jest.fn().mockResolvedValue(records);

  return {
    repositoryFind,
    ormManager: {
      executeInWorkspaceContext: (fn: () => Promise<unknown>) => fn(),
      getRepository: () => ({
        find: repositoryFind,
      }),
    } as unknown as WorkspaceOrmManager,
  };
};

describe('DocumentSearchProviderService', () => {
  it('is registered for the a2e-documents app universal identifier', () => {
    expect(
      getRegisteredSearchProviderMetadata(DocumentSearchProviderService),
    ).toMatchObject({
      appUniversalIdentifier: A2E_DOCUMENTS_APP_UNIVERSAL_IDENTIFIER,
    });
  });

  it('returns no items for a blank search input without querying', async () => {
    const { ormManager } = buildOrmManagerMock([]);
    const provider = new DocumentSearchProviderService(ormManager);

    await expect(
      provider.search({
        searchInput: '   ',
        limit: 5,
        workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
      }),
    ).resolves.toEqual({ items: [] });
  });

  it('maps non-archived documents to record-show deep links', async () => {
    const { ormManager } = buildOrmManagerMock([
      documentRecord('doc-1', 'Notes de réunion'),
    ]);
    const provider = new DocumentSearchProviderService(ormManager);

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

  it('does not bypass permission checks and relies on the caller auth context', async () => {
    const { ormManager, repositoryFind } = buildOrmManagerMock([]);
    const getRepository = jest.fn();

    (ormManager as unknown as { getRepository: jest.Mock }).getRepository =
      getRepository;
    (ormManager as unknown as {
      executeInWorkspaceContext: unknown;
    }).executeInWorkspaceContext = (fn: () => Promise<unknown>) => fn();
    getRepository.mockReturnValue({ find: repositoryFind });

    const provider = new DocumentSearchProviderService(ormManager);

    await provider.search({
      searchInput: 'notes',
      limit: 5,
      workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
    });

    // No RolePermissionConfig argument: the caller's role/row permissions apply.
    expect(getRepository).toHaveBeenCalledWith('document');
    expect(getRepository).not.toHaveBeenCalledWith(
      'document',
      expect.objectContaining({ shouldBypassPermissionChecks: true }),
    );
  });

  it('escapes ILIKE wildcards so % and _ match literally', async () => {
    const { ormManager, repositoryFind } = buildOrmManagerMock([]);
    const provider = new DocumentSearchProviderService(ormManager);

    await provider.search({
      searchInput: '100%_done',
      limit: 5,
      workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
    });

    expect(repositoryFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: { ilike: '%100\\%\\_done%' },
        }),
      }),
    );
  });

  it('filters out malformed records before mapping', async () => {
    const { ormManager } = buildOrmManagerMock([
      { id: 'doc-2', title: null } as unknown as { id: string; title: string },
    ]);
    const provider = new DocumentSearchProviderService(ormManager);

    await expect(
      provider.search({
        searchInput: 'anything',
        limit: 5,
        workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
      }),
    ).resolves.toEqual({ items: [] });
  });
});
