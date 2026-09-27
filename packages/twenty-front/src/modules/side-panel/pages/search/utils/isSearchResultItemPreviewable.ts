import { isDefined } from 'twenty-shared/utils';

import { type SearchResultItem } from '@/side-panel/pages/search/hooks/useSidePanelSearchRecords';

// Virtual navigation entries (e.g. the Help row) carry a synthetic object name
// with no installed metadata. The preview card's `useObjectMetadataItem` throws
// for those and the error boundary takes the whole search surface down, so only
// items backed by a real, installed object are previewable.
export const isSearchResultItemPreviewable = (
  item: SearchResultItem | null,
  installedObjectNameSingulars: ReadonlySet<string>,
): item is SearchResultItem =>
  isDefined(item) && installedObjectNameSingulars.has(item.objectNameSingular);
