import { getRegisteredSearchProviderMetadata } from 'src/engine/core-modules/search/decorators/registered-search-provider.decorator';
import { A2eProjectsSearchProviderService } from 'src/engine/core-modules/search/services/a2e-projects-search-provider.service';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

// APPLICATION_UNIVERSAL_IDENTIFIER of a2e-projects; inlined because server
// tests do not resolve the twenty-apps package (same hermetic pattern as the
// sibling document provider spec).
const A2E_PROJECTS_APP_UNIVERSAL_IDENTIFIER =
  '4f759655-84f8-434d-9c76-ee1850e8c1a4';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_WORKSPACE_ID = '20202020-1e7c-43d9-a5db-685b5069d816';
const AMBIENT_ROLE_ID = 'role-restricted-member';

const taskRecord = (id: string, title: string | null) => ({ id, title });
const projectRecord = (id: string, name: string | null) => ({ id, name });

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
  tasks,
  projects,
  roleId = AMBIENT_ROLE_ID,
}: {
  tasks: { id: string; title: string | null }[];
  projects: { id: string; name: string | null }[];
  roleId?: string | null;
}): {
  ormManager: WorkspaceOrmManager;
  getRepository: jest.Mock;
  taskFind: jest.Mock;
  projectFind: jest.Mock;
} => {
  const taskFind = jest.fn().mockResolvedValue(tasks);
  const projectFind = jest.fn().mockResolvedValue(projects);

  const getRepository = jest.fn((objectName: string) =>
    objectName === 'task' ? { find: taskFind } : { find: projectFind },
  );

  const ormManager = {
    executeInWorkspaceContext: (fn: () => Promise<unknown>) =>
      withWorkspaceContext(buildUserWorkspaceContext({ roleId }), fn),
    getRepository,
  } as unknown as WorkspaceOrmManager;

  return { ormManager, getRepository, taskFind, projectFind };
};

describe('A2eProjectsSearchProviderService', () => {
  it('is registered for the a2e-projects app universal identifier', () => {
    expect(
      getRegisteredSearchProviderMetadata(A2eProjectsSearchProviderService),
    ).toMatchObject({
      appUniversalIdentifier: A2E_PROJECTS_APP_UNIVERSAL_IDENTIFIER,
    });
  });

  it('returns no items for a blank search input without querying', async () => {
    const { ormManager, taskFind, projectFind } = buildOrmManagerMock({
      tasks: [],
      projects: [],
    });
    const provider = new A2eProjectsSearchProviderService(ormManager);

    await expect(
      provider.search({
        searchInput: '   ',
        limit: 5,
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toEqual({ items: [] });

    expect(taskFind).not.toHaveBeenCalled();
    expect(projectFind).not.toHaveBeenCalled();
  });

  it('groups tasks and projects with distinct labels and deep links', async () => {
    const { ormManager } = buildOrmManagerMock({
      tasks: [taskRecord('task-1', 'Préparer le devis')],
      projects: [projectRecord('project-1', 'Refonte du site')],
    });
    const provider = new A2eProjectsSearchProviderService(ormManager);

    await expect(
      provider.search({
        searchInput: 're',
        limit: 5,
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toEqual({
      items: [
        {
          recordId: 'task-1',
          label: 'Préparer le devis',
          description: 'Tâche',
          path: '/object/task/task-1',
        },
        {
          recordId: 'project-1',
          label: 'Refonte du site',
          description: 'Projet',
          path: '/object/project/project-1',
        },
      ],
    });
  });

  it('searches tasks by title and non-archived projects by name', async () => {
    const { ormManager, taskFind, projectFind } = buildOrmManagerMock({
      tasks: [],
      projects: [],
    });
    const provider = new A2eProjectsSearchProviderService(ormManager);

    await provider.search({
      searchInput: 'devis',
      limit: 7,
      workspaceId: WORKSPACE_ID,
    });

    expect(taskFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { title: { ilike: '%devis%' } },
        take: 7,
      }),
    );

    expect(projectFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { ilike: '%devis%' }, archivedAt: null },
        take: 7,
      }),
    );
  });

  it('runs every query under the caller role, never a permission bypass', async () => {
    const { ormManager, getRepository } = buildOrmManagerMock({
      tasks: [],
      projects: [],
    });
    const provider = new A2eProjectsSearchProviderService(ormManager);

    await provider.search({
      searchInput: 'devis',
      limit: 5,
      workspaceId: WORKSPACE_ID,
    });

    expect(getRepository).toHaveBeenCalledWith('task', {
      intersectionOf: [AMBIENT_ROLE_ID],
    });
    expect(getRepository).toHaveBeenCalledWith('project', {
      intersectionOf: [AMBIENT_ROLE_ID],
    });

    expect(getRepository).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ shouldBypassPermissionChecks: true }),
    );
  });

  it('fails closed with no role permission config when the caller has no role', async () => {
    const { ormManager, getRepository } = buildOrmManagerMock({
      tasks: [],
      projects: [],
      roleId: null,
    });
    const provider = new A2eProjectsSearchProviderService(ormManager);

    await provider.search({
      searchInput: 'devis',
      limit: 5,
      workspaceId: WORKSPACE_ID,
    });

    // undefined ⇒ empty object permissions ⇒ select denied on the non-system
    // objects, never an unscoped read.
    expect(getRepository).toHaveBeenCalledWith('task', undefined);
    expect(getRepository).toHaveBeenCalledWith('project', undefined);
  });

  it('scopes the query to the ambient workspace, never the caller-supplied id', async () => {
    const { ormManager, getRepository, taskFind, projectFind } =
      buildOrmManagerMock({
        tasks: [taskRecord('task-1', 'Devis')],
        projects: [],
      });
    const provider = new A2eProjectsSearchProviderService(ormManager);

    await provider.search({
      searchInput: 'devis',
      limit: 5,
      // A foreign workspace id must not change which datasource is queried:
      // the repositories come from the ambient, authenticated context only.
      workspaceId: '3b8e6458-5fc1-4e63-8563-008ccddaa6db',
    });

    expect(getRepository).toHaveBeenCalledWith('task', {
      intersectionOf: [AMBIENT_ROLE_ID],
    });

    for (const find of [taskFind, projectFind]) {
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            workspaceId: expect.anything(),
          }),
        }),
      );
    }
  });

  it('escapes ILIKE wildcards so % and _ match literally', async () => {
    const { ormManager, taskFind, projectFind } = buildOrmManagerMock({
      tasks: [],
      projects: [],
    });
    const provider = new A2eProjectsSearchProviderService(ormManager);

    await provider.search({
      searchInput: '100%_done',
      limit: 5,
      workspaceId: WORKSPACE_ID,
    });

    expect(taskFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { title: { ilike: '%100\\%\\_done%' } },
      }),
    );
    expect(projectFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name: { ilike: '%100\\%\\_done%' },
          archivedAt: null,
        },
      }),
    );
  });

  it('filters out malformed records before mapping', async () => {
    const { ormManager } = buildOrmManagerMock({
      tasks: [taskRecord('task-2', null)],
      projects: [projectRecord('project-2', null)],
    });
    const provider = new A2eProjectsSearchProviderService(ormManager);

    await expect(
      provider.search({
        searchInput: 'anything',
        limit: 5,
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toEqual({ items: [] });
  });
});
