import { Injectable, Logger } from '@nestjs/common';

import { escapeForIlike, isDefined } from 'twenty-shared/utils';
import { ILike } from 'typeorm';

import { RegisteredSearchProvider } from 'src/engine/core-modules/search/decorators/registered-search-provider.decorator';
import {
  SearchProviderParams,
  type SearchProvider,
  type SearchProviderResult,
} from 'src/engine/core-modules/search/types/search-provider.type';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { resolveRolePermissionConfig } from 'src/engine/twenty-orm/utils/resolve-role-permission-config.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

// APPLICATION_UNIVERSAL_IDENTIFIER of the a2e-documents app
// (packages/twenty-apps/internal/a2e-documents/src/application.config.ts).
// Keying the provider to that id makes the results group under "A2E
// Documents" in Cmd+K and gates the provider on the app's install state.
const A2E_DOCUMENTS_APP_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

type DocumentSearchRecord = {
  id: string;
  title: string;
};

// Workspace-object repositories are untyped for app-defined objects; the
// projection below is what the query selects.
type DocumentWorkspaceRepository = {
  find(options: {
    where: { title: unknown; archivedAt: null };
    select: { id: true; title: true };
    order: { title: 'ASC' };
    take: number;
  }): Promise<DocumentSearchRecord[]>;
};

@RegisteredSearchProvider({
  appUniversalIdentifier: A2E_DOCUMENTS_APP_UNIVERSAL_IDENTIFIER,
})
@Injectable()
export class DocumentSearchProviderService implements SearchProvider {
  private readonly logger = new Logger(DocumentSearchProviderService.name);

  constructor(private readonly workspaceOrmManager: WorkspaceOrmManager) {}

  // ILIKE over the title of non-archived documents, ordered by title so the
  // truncated result set is stable. Position (fractional index) orders the
  // tree but is meaningless for search ranking.
  // Runs under the CALLER's auth context (ambient AsyncLocalStorage from the
  // GraphQL middleware) with normal repository permissions: a role or row
  // predicate that hides a document must also hide it from Cmd+K. The role
  // permission config MUST be resolved from that ambient context and passed to
  // getRepository — without it the repository has empty object permissions,
  // which denies select on the non-system `document` object (every caller gets
  // a caught PERMISSION_DENIED and an empty Cmd+K group). Never re-introduce a
  // system context or shouldBypassPermissionChecks here.
  async search(params: SearchProviderParams): Promise<SearchProviderResult> {
    const searchInput = params.searchInput.trim();

    if (searchInput === '') {
      return { items: [] };
    }

    // The cast keeps the untyped workspace repository honest: `find` with this
    // select projection returns exactly DocumentSearchRecord rows. The match
    // goes through the TypeORM ILIKE FindOperator: the workspace ORM only
    // renders operators it can recognize as FindOperator instances, so a plain
    // `{ ilike }` object is bound as equality and matches nothing.
    const records = (await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const context = getWorkspaceContext();
        const rolePermissionConfig =
          resolveRolePermissionConfig({
            authContext: context.authContext,
            userWorkspaceRoleMap: context.userWorkspaceRoleMap,
            apiKeyRoleMap: context.apiKeyRoleMap,
          }) ?? undefined;

        const documentRepository =
          this.workspaceOrmManager.getRepository<DocumentWorkspaceRepository>(
            'document',
            rolePermissionConfig,
          );

        return documentRepository.find({
          where: {
            title: ILike(`%${escapeForIlike(searchInput)}%`),
            archivedAt: null,
          },
          select: { id: true, title: true },
          order: { title: 'ASC' },
          take: params.limit,
        });
      },
    )) as unknown as DocumentSearchRecord[];

    return {
      items: records
        .filter((record) => isDefined(record.id) && isDefined(record.title))
        .map((record) => ({
          recordId: record.id,
          label: record.title,
          description: 'Document',
          // Record-show deep link; the Cmd+K host resolves it to a side
          // panel or full page.
          path: `/object/documents/${record.id}`,
        })),
    };
  }
}
