import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { useContext } from 'react';
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
type RecentPagesWidgetProps = { onSelectPage?: (pageId: string) => void };

export const RecentPagesWidget = ({ onSelectPage }: RecentPagesWidgetProps) => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const workspace = useContext(BureauWorkspaceContext);

  if (workspace)
    return (
      <RecentPagesWidgetContent
        entries={getRecentPagesEntries(
          workspace.documents.map((page) => ({
            id: page.id,
            title: page.title ?? '',
            kind: page.kind ?? null,
            updatedAt: page.updatedAt,
          })),
        )}
        onSelectEntry={onSelectPage}
      />
    );

  if (
    !hasObjectMetadataItem(objectMetadataItems, DOCUMENT_OBJECT_NAME_SINGULAR)
  ) {
    return <RecentPagesWidgetContent entries={[]} />;
  }

  return <RecentPagesRecords onSelectPage={onSelectPage} />;
};

type RecentPagesRecordsProps = RecentPagesWidgetProps;

const RecentPagesRecords = ({ onSelectPage }: RecentPagesRecordsProps) => {
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const { records } = useFindManyRecords({
    objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
    orderBy: [{ updatedAt: 'DescNullsLast' }],
    limit: RECENT_PAGES_WIDGET_LIMIT,
    recordGqlFields: { id: true, title: true, kind: true, updatedAt: true },
  });

  const entries = getRecentPagesEntries(
    records as unknown as HomeRecentPageSummary[],
  );

  const handleSelectPage = (pageId: string) => {
    if (onSelectPage) {
      onSelectPage(pageId);
      return;
    }
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

const getRecentPagesEntries = (
  pages: HomeRecentPageSummary[],
): HomeWidgetListEntry[] =>
  selectRecentPages(pages, { limit: RECENT_PAGES_WIDGET_LIMIT }).map(
    (page) => ({
      id: page.id,
      title: page.title,
      subtitle: formatHomeWidgetDayLabel(page.updatedAt ?? ''),
    }),
  );
