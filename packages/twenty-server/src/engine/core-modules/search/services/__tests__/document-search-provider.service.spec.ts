import { getRegisteredSearchProviderMetadata } from 'src/engine/core-modules/search/decorators/registered-search-provider.decorator';
import { DocumentSearchProviderService } from 'src/engine/core-modules/search/services/document-search-provider.service';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

// APPLICATION_UNIVERSAL_IDENTIFIER of a2e-documents; inlined because server
// tests do not resolve the twenty-apps package (same hermetic pattern as the
// sibling registry spec).
const A2E_DOCUMENTS_APP_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_WORKSPACE_ID = '20202020-1e7c-43d9-a5db-685b5069d816';

const documentRecord = (id: string, title: string) => ({ id, title });

// Mirrors what WorkspaceOrmManager.loadWorkspaceContext puts in the ambient
// AsyncLocalStorage: the user auth context plus the role maps the permission
// resolver reads. Only the fields resolveRolePermissionConfig touches are
// populated; the rest are cast away.
const buildUserWorkspaceContext = ({
  roleId,
}: {
  roleId: string | null | undefined;
}): ORMWorkspaceContext =>
  ({
    authContext: {
      type: 'user',
      workspace: { id: WORKSPACE_ID },
      userWorkspaceId: USER_WORKSPACE_ID,
      user: { id: USER_WORKSPACE_ID },
      workspaceMemberId: '20202020-77d5-4cb6-b60a-f4a835a85d61',
      workspaceMember: { id: '20202020-77d5-4cb6-b60a-f4a835a85d61' },
    },
    userWorkspaceRoleMap: roleId ? { [USER_WORKSPACE_ID]: roleId } : {},
    apiKeyRoleMap: {},
  }) as unknown as ORMWorkspaceContext;

const buildOrmManagerMock = ({
  records,
  roleId = 'role-restricted-member',
}: {
  records: { id: string; title: string }[];
  roleId?: string | null;
}): {
  ormManager: WorkspaceOrmManager;
  repositoryFind: jest.Mock;
  getRepository: jest.Mock;
} => {
  const repositoryFind = jest.fn().mockResolvedValue(records);

  const getRepository = jest.fn().mockReturnValue({ find: repositoryFind });

  const ormManager = {
    executeInWorkspaceContext: (fn: () => Promise<unknown>) =>
      withWorkspaceContext(buildUserWorkspaceContext({ roleId }), fn),
    getRepository,
  } as unknown as WorkspaceOrmManager;

  return { ormManager, repositoryFind, getRepository };
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
    const { ormManager, repositoryFind } = buildOrmManagerMock({
      records: [],
    });
    const provider = new DocumentSearchProviderService(ormManager);

    await expect(
      provider.search({
        searchInput: '   ',
        limit: 5,
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toEqual({ items: [] });

    expect(repositoryFind).not.toHaveBeenCalled();
  });

  it('maps non-archived documents to record-show deep links', async () => {
    const { ormManager } = buildOrmManagerMock({
      records: [documentRecord('doc-1', 'Notes de réunion')],
    });
    const provider = new DocumentSearchProviderService(ormManager);

    await expect(
      provider.search({
        searchInput: 'réunion',
        limit: 5,
        workspaceId: WORKSPACE_ID,
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

  it('runs the query under the caller role, never a permission bypass', async () => {
    const { ormManager, getRepository } = buildOrmManagerMock({
      records: [],
      roleId: 'role-restricted-member',
    });
    const provider = new DocumentSearchProviderService(ormManager);

    await provider.search({
      searchInput: 'notes',
      limit: 5,
      workspaceId: WORKSPACE_ID,
    });

    expect(getRepository).toHaveBeenCalledWith('document', {
      intersectionOf: ['role-restricted-member'],
    });

    expect(getRepository).not.toHaveBeenCalledWith(
      'document',
      expect.objectContaining({ shouldBypassPermissionChecks: true }),
    );
  });

  it('fails closed with no role permission config when the caller has no role', async () => {
    const { ormManager, getRepository } = buildOrmManagerMock({
      records: [],
      roleId: null,
    });
    const provider = new DocumentSearchProviderService(ormManager);

    await provider.search({
      searchInput: 'notes',
      limit: 5,
      workspaceId: WORKSPACE_ID,
    });

    // undefined ⇒ empty object permissions ⇒ select denied on the non-system
    // document object, never an unscoped read.
    expect(getRepository).toHaveBeenCalledWith('document', undefined);
  });

  it('scopes the query to the ambient workspace, never the caller-supplied id', async () => {
    const { ormManager, getRepository, repositoryFind } = buildOrmManagerMock({
      records: [documentRecord('doc-1', 'Notes')],
    });
    const provider = new DocumentSearchProviderService(ormManager);

    await provider.search({
      searchInput: 'notes',
      limit: 5,
      // A foreign workspace id must not change which datasource is queried:
      // the repository comes from the ambient, authenticated context only.
      workspaceId: '3b8e6458-5fc1-4e63-8563-008ccddaa6db',
    });

    expect(getRepository).toHaveBeenCalledWith('document', {
      intersectionOf: ['role-restricted-member'],
    });

    expect(repositoryFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          workspaceId: expect.anything(),
        }),
      }),
    );
  });

  it('escapes ILIKE wildcards so % and _ match literally', async () => {
    const { ormManager, repositoryFind } = buildOrmManagerMock({
      records: [],
    });
    const provider = new DocumentSearchProviderService(ormManager);

    await provider.search({
      searchInput: '100%_done',
      limit: 5,
      workspaceId: WORKSPACE_ID,
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
    const { ormManager } = buildOrmManagerMock({
      records: [
        {
          id: 'doc-2',
          title: null,
        } as unknown as { id: string; title: string },
      ],
    });
    const provider = new DocumentSearchProviderService(ormManager);

    await expect(
      provider.search({
        searchInput: 'anything',
        limit: 5,
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toEqual({ items: [] });
  });
});
