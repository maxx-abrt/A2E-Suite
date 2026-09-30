import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { RecentPagesWidgetContent } from '@/home-dashboard/components/RecentPagesWidgetContent';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';
import { formatHomeWidgetDayLabel } from '@/home-dashboard/utils/formatHomeWidgetDayLabel';
import { hasObjectMetadataItem } from '@/home-dashboard/utils/hasObjectMetadataItem';
import {
  type HomeRecentPageSummary,
  selectRecentPages,
} from '@/home-dashboard/utils/selectRecentPages';

const RECENT_PAGES_WIDGET_LIMIT = 8;

const DOCUMENT_OBJECT_NAME_SINGULAR = 'document';

// Bureau owns the `document` object, so the card self-gates: when the app is
// absent the fetch is never reached and the widget shows its empty state.
export const RecentPagesWidget = () => {
  const { objectMetadataItems } = useObjectMetadataItems();

  if (
    !hasObjectMetadataItem(objectMetadataItems, DOCUMENT_OBJECT_NAME_SINGULAR)
  ) {
    return <RecentPagesWidgetContent entries={[]} />;
  }

  return <RecentPagesRecords />;
};

const RecentPagesRecords = () => {
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const { records } = useFindManyRecords({
    objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
    orderBy: [{ updatedAt: 'DescNullsLast' }],
    limit: RECENT_PAGES_WIDGET_LIMIT,
    recordGqlFields: { id: true, title: true, kind: true, updatedAt: true },
  });

  const pages = selectRecentPages(
    records as unknown as HomeRecentPageSummary[],
    {
      limit: RECENT_PAGES_WIDGET_LIMIT,
    },
  );

  const entries: HomeWidgetListEntry[] = pages.map((page) => ({
    id: page.id,
    title: page.title,
    subtitle: formatHomeWidgetDayLabel(page.updatedAt ?? ''),
  }));

  const handleSelectPage = (pageId: string) => {
    openRecordInSidePanel({
      recordId: pageId,
      objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
    });
  };

  return (
    <RecentPagesWidgetContent
      entries={entries}
      onSelectEntry={handleSelectPage}
    />
  );
};
