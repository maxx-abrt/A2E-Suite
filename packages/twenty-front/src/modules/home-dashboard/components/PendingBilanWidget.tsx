import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';

import { PendingBilanWidgetContent } from '@/home-dashboard/components/PendingBilanWidgetContent';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';
import { formatHomeWidgetDayLabel } from '@/home-dashboard/utils/formatHomeWidgetDayLabel';
import { hasObjectMetadataItem } from '@/home-dashboard/utils/hasObjectMetadataItem';
import {
  type HomeBilanGrantSummary,
  type HomeBilanInvoiceSummary,
  selectPendingBilanItems,
} from '@/home-dashboard/utils/selectPendingBilanItems';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';

const PENDING_BILAN_WIDGET_LIMIT = 8;

const BILAN_INVOICE_OBJECT_NAME_SINGULAR = 'invoice';

const BILAN_SAVED_SUBVENTION_OBJECT_NAME_SINGULAR = 'savedSubvention';

// Bilan installs as a unit, so `invoice` is the install signal for both the
// invoices and the grant-deadline leg. An absent app renders the empty state.
export const PendingBilanWidget = () => {
  const { objectMetadataItems } = useObjectMetadataItems();

  if (
    !hasObjectMetadataItem(
      objectMetadataItems,
      BILAN_INVOICE_OBJECT_NAME_SINGULAR,
    )
  ) {
    return <PendingBilanWidgetContent entries={[]} />;
  }

  return <PendingBilanRecords />;
};

const PendingBilanRecords = () => {
  const { t } = useLingui();
  const now = useMemo(() => new Date(), []);
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const { records: invoiceRecords } = useFindManyRecords({
    objectNameSingular: BILAN_INVOICE_OBJECT_NAME_SINGULAR,
    filter: {
      and: [
        { status: { neq: 'PAID' } },
        { status: { neq: 'CANCELLED' } },
        { dueDate: { is: 'NOT_NULL' } },
      ],
    },
    orderBy: [{ dueDate: 'AscNullsFirst' }],
    limit: PENDING_BILAN_WIDGET_LIMIT,
    recordGqlFields: { id: true, number: true, status: true, dueDate: true },
  });

  const { records: grantRecords } = useFindManyRecords({
    objectNameSingular: BILAN_SAVED_SUBVENTION_OBJECT_NAME_SINGULAR,
    filter: {
      and: [
        { status: { in: ['SHORTLISTED', 'PREPARING'] } },
        { deadline: { is: 'NOT_NULL' } },
      ],
    },
    orderBy: [{ deadline: 'AscNullsFirst' }],
    limit: PENDING_BILAN_WIDGET_LIMIT,
    recordGqlFields: { id: true, name: true, status: true, deadline: true },
  });

  const items = selectPendingBilanItems(
    {
      invoices: invoiceRecords as unknown as HomeBilanInvoiceSummary[],
      grants: grantRecords as unknown as HomeBilanGrantSummary[],
    },
    { now, limit: PENDING_BILAN_WIDGET_LIMIT },
  );

  const objectNameSingularByItemId = new Map<string, string>(
    items.map((item) => [
      item.id,
      item.source === 'invoice'
        ? BILAN_INVOICE_OBJECT_NAME_SINGULAR
        : BILAN_SAVED_SUBVENTION_OBJECT_NAME_SINGULAR,
    ]),
  );

  const entries: HomeWidgetListEntry[] = items.map((item) => ({
    id: item.id,
    title: item.title.length > 0 ? item.title : t`Invoice`,
    subtitle: formatHomeWidgetDayLabel(item.deadline),
    trailingLabel: item.isOverdue ? t`Overdue` : undefined,
    isOverdue: item.isOverdue,
  }));

  const handleSelectItem = (itemId: string) => {
    const objectNameSingular = objectNameSingularByItemId.get(itemId);

    if (objectNameSingular === undefined) {
      return;
    }

    openRecordInSidePanel({ recordId: itemId, objectNameSingular });
  };

  return (
    <PendingBilanWidgetContent
      entries={entries}
      onSelectEntry={handleSelectItem}
    />
  );
};
