import { Injectable, Logger } from '@nestjs/common';

import { RegisteredSearchProvider } from 'src/engine/core-modules/search/decorators/registered-search-provider.decorator';
import {
  SearchProviderParams,
  type SearchProvider,
  type SearchProviderResult,
} from 'src/engine/core-modules/search/types/search-provider.type';

// APPLICATION_UNIVERSAL_IDENTIFIER of the a2e-documents app
// (packages/twenty-apps/internal/a2e-documents/src/application.config.ts).
// Keying the provider to that id makes the results group under "A2E
// Documents" in Cmd+K and gates the provider on the app's install state.
const A2E_DOCUMENTS_APP_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

/**
 * Placeholder provider for the Documents app (P3). The `document` object does
 * not exist yet, so the provider returns no items; registering it now wires
 * the group heading, install gating and deep-link contract end-to-end so P3
 * only fills the `search` body.
 */
@RegisteredSearchProvider({
  appUniversalIdentifier: A2E_DOCUMENTS_APP_UNIVERSAL_IDENTIFIER,
})
@Injectable()
export class DocumentSearchProviderService implements SearchProvider {
  private readonly logger = new Logger(DocumentSearchProviderService.name);

  // P3 replaces this with a query over the `document` object once its
  // metadata exists; keeping the provider registered avoids a second
  // wiring pass.
  async search(_params: SearchProviderParams): Promise<SearchProviderResult> {
    return { items: [] };
  }
}
