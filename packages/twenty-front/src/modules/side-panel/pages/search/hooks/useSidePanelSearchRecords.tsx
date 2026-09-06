import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { useObjectRecordSearchRecords } from '@/object-record/hooks/useObjectRecordSearchRecords';
import { useSearchableObjectNameSingulars } from '@/side-panel/hooks/useSearchableObjectNameSingulars';
import { type GroupableSearchResultItem } from '@/side-panel/pages/search/utils/groupSearchResultItems';
import { sidePanelSearchObjectFilterState } from '@/side-panel/states/sidePanelSearchObjectFilterState';
import { sidePanelSearchState } from '@/side-panel/states/sidePanelSearchState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useMemo } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { useDebounce } from 'use-debounce';

export type SearchResultItem = {
  id: string;
  label: string;
  objectNameSingular: string;
  recordId: string;
  imageUrl?: string | null;
  objectLabel: string;
  avatarType: 'squared' | 'rounded';
  description?: string;
};

export const useSidePanelSearchRecords = () => {
  const sidePanelSearch = useAtomStateValue(sidePanelSearchState);
  const sidePanelSearchObjectFilter = useAtomStateValue(
    sidePanelSearchObjectFilterState,
  );
  const trimmedSidePanelSearch = sidePanelSearch.trim();

  const [deferredSidePanelSearch] = useDebounce(trimmedSidePanelSearch, 300);
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();
  const includedObjectNameSingulars = useSearchableObjectNameSingulars({
    selectedObjectNameSingular: sidePanelSearchObjectFilter,
  });

  const { loading, searchRecords } = useObjectRecordSearchRecords({
    objectNameSingulars: includedObjectNameSingulars,
    searchInput: deferredSidePanelSearch,
  });

  const searchResultItems: GroupableSearchResultItem[] = useMemo(() => {
    return searchRecords.map((searchRecord) => {
      const objectLabel =
        readableObjectMetadataItems.find(
          (item) => item.nameSingular === searchRecord.objectNameSingular,
        )?.labelSingular ?? searchRecord.objectNameSingular;

      return {
        id: searchRecord.recordId,
        label: searchRecord.label,
        objectNameSingular: searchRecord.objectNameSingular,
        recordId: searchRecord.recordId,
        imageUrl: searchRecord.imageUrl,
        objectLabel,
        // Group key is the raw object name (stable across locales); the
        // heading is the translated label shown as group header.
        groupKey: searchRecord.objectNameSingular,
        groupHeading: objectLabel,
        avatarType:
          searchRecord.objectNameSingular === CoreObjectNameSingular.Company
            ? ('squared' as const)
            : ('rounded' as const),
      };
    });
  }, [searchRecords, readableObjectMetadataItems]);

  return {
    sidePanelSearch: trimmedSidePanelSearch,
    loading,
    noResults: !searchResultItems.length,
    searchResultItems,
  };
};
