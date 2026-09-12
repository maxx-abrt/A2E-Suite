import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { RegisteredSearchProvider } from 'src/engine/core-modules/search/decorators/registered-search-provider.decorator';
import {
  SearchProviderParams,
  type SearchProvider,
  type SearchProviderResult,
} from 'src/engine/core-modules/search/types/search-provider.type';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

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
  async search(params: SearchProviderParams): Promise<SearchProviderResult> {
    const searchInput = params.searchInput.trim();

    if (searchInput === '') {
      return { items: [] };
    }

    const authContext = buildSystemAuthContext(params.workspaceId);

    // The cast keeps the untyped workspace repository honest: `find` with this
    // select projection returns exactly DocumentSearchRecord rows.
    const records = (await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const documentRepository =
          this.workspaceOrmManager.getRepository<DocumentWorkspaceRepository>(
            'document',
            { shouldBypassPermissionChecks: true },
          );

        return documentRepository.find({
          where: {
            title: { ilike: `%${searchInput}%` },
            archivedAt: null,
          },
          select: { id: true, title: true },
          order: { title: 'ASC' },
          take: params.limit,
        });
      },
      authContext,
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
