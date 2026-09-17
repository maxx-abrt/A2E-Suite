import { Injectable, Logger } from '@nestjs/common';

import { escapeForIlike, isDefined } from 'twenty-shared/utils';

import { RegisteredSearchProvider } from 'src/engine/core-modules/search/decorators/registered-search-provider.decorator';
import {
  SearchProviderParams,
  type SearchProvider,
  type SearchProviderResult,
} from 'src/engine/core-modules/search/types/search-provider.type';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { resolveRolePermissionConfig } from 'src/engine/twenty-orm/utils/resolve-role-permission-config.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

// APPLICATION_UNIVERSAL_IDENTIFIER of the a2e-projects app
// (packages/twenty-apps/internal/a2e-projects/src/application.config.ts).
// Keying the provider to that id makes tasks and projects group together
// under "A2E Projects" in Cmd+K and gates the provider on the app's install
// state.
const A2E_PROJECTS_APP_UNIVERSAL_IDENTIFIER =
  '4f759655-84f8-434d-9c76-ee1850e8c1a4';

type TaskSearchRecord = {
  id: string;
  title: string | null;
};

type ProjectSearchRecord = {
  id: string;
  name: string | null;
};

type ProjectSearchRecords = {
  tasks: TaskSearchRecord[];
  projects: ProjectSearchRecord[];
};

// Workspace-object repositories are untyped for the projections below; each
// type describes exactly the select the matching query asks for.
type TaskWorkspaceRepository = {
  find(options: {
    where: { title: unknown };
    select: { id: true; title: true };
    order: { title: 'ASC' };
    take: number;
  }): Promise<TaskSearchRecord[]>;
};

type ProjectWorkspaceRepository = {
  find(options: {
    where: { name: unknown; archivedAt: null };
    select: { id: true; name: true };
    order: { name: 'ASC' };
    take: number;
  }): Promise<ProjectSearchRecord[]>;
};

// One provider covers both a2e-projects object types: tasks live on the
// standard `task` object (app-extended) and projects on the app's `project`
// object. The Cmd+K host buckets every item under the app group key, so a
// single provider keeps the group assembled in one place.
@RegisteredSearchProvider({
  appUniversalIdentifier: A2E_PROJECTS_APP_UNIVERSAL_IDENTIFIER,
})
@Injectable()
export class A2eProjectsSearchProviderService implements SearchProvider {
  private readonly logger = new Logger(A2eProjectsSearchProviderService.name);

  constructor(private readonly workspaceOrmManager: WorkspaceOrmManager) {}

  // ILIKE over task.title and project.name, ordered by that field so the
  // truncated result set stays stable. Archived projects are excluded
  // (project has an app-level archivedAt corbeille); tasks rely on the
  // standard object's soft-delete behaviour, same as core object search.
  // Runs under the CALLER's auth context (ambient AsyncLocalStorage from the
  // GraphQL middleware) with normal repository permissions: a role or row
  // predicate that hides a record must also hide it from Cmd+K. The role
  // permission config MUST be resolved from that ambient context and passed
  // to getRepository — without it the repository has empty object
  // permissions, which denies select on the non-system objects and returns
  // empty Cmd+K groups. Never re-introduce a system context or
  // shouldBypassPermissionChecks here.
  async search(params: SearchProviderParams): Promise<SearchProviderResult> {
    const searchInput = params.searchInput.trim();

    if (searchInput === '') {
      return { items: [] };
    }

    const pattern = `%${escapeForIlike(searchInput)}%`;

    // The cast keeps the untyped workspace repositories honest: the two `find`
    // projections below return exactly TaskSearchRecord / ProjectSearchRecord
    // rows.
    const records = (await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const context = getWorkspaceContext();
        const rolePermissionConfig =
          resolveRolePermissionConfig({
            authContext: context.authContext,
            userWorkspaceRoleMap: context.userWorkspaceRoleMap,
            apiKeyRoleMap: context.apiKeyRoleMap,
          }) ?? undefined;

        const taskRepository =
          this.workspaceOrmManager.getRepository<TaskWorkspaceRepository>(
            'task',
            rolePermissionConfig,
          );
        const projectRepository =
          this.workspaceOrmManager.getRepository<ProjectWorkspaceRepository>(
            'project',
            rolePermissionConfig,
          );

        const tasks = await taskRepository.find({
          where: { title: { ilike: pattern } },
          select: { id: true, title: true },
          order: { title: 'ASC' },
          take: params.limit,
        });

        const projects = await projectRepository.find({
          where: { name: { ilike: pattern }, archivedAt: null },
          select: { id: true, name: true },
          order: { name: 'ASC' },
          take: params.limit,
        });

        return { tasks, projects };
      },
    )) as unknown as ProjectSearchRecords;

    const taskItems = records.tasks
      .filter((record) => isDefined(record.id) && isDefined(record.title))
      .map((record) => ({
        recordId: record.id,
        label: record.title as string,
        description: 'Tâche',
        // Record-show deep links; the Cmd+K host resolves them to a side
        // panel or full page. The route parameter is the object name
        // SINGULAR (RecordShowPage matches on nameSingular).
        path: `/object/task/${record.id}`,
      }));

    const projectItems = records.projects
      .filter((record) => isDefined(record.id) && isDefined(record.name))
      .map((record) => ({
        recordId: record.id,
        label: record.name as string,
        description: 'Projet',
        path: `/object/project/${record.id}`,
      }));

    return { items: [...taskItems, ...projectItems] };
  }
}
