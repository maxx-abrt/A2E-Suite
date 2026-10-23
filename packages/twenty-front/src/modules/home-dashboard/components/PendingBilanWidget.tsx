import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';

import { PendingBilanWidgetContent } from '@/home-dashboard/components/PendingBilanWidgetContent';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';
import { formatHomeWidgetDayLabel } from '@/home-dashboard/utils/formatHomeWidgetDayLabel';
import { hasObjectMetadataItem } from '@/home-dashboard/utils/hasObjectMetadataItem';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import {
  type HomeBilanGrantSummary,
  type HomeBilanInvoiceSummary,
  HOME_BILAN_PENDING_INVOICE_STATUSES,
  selectPendingBilanItems,
} from '@/home-dashboard/utils/selectPendingBilanItems';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';

const PENDING_BILAN_WIDGET_LIMIT = 8;

const BILAN_INVOICE_OBJECT_NAME_SINGULAR = 'invoice';

const BILAN_SAVED_SUBVENTION_OBJECT_NAME_SINGULAR = 'savedSubvention';

export const PendingBilanWidget = () => {
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();
  const canReadInvoices = hasObjectMetadataItem(
    readableObjectMetadataItems,
    BILAN_INVOICE_OBJECT_NAME_SINGULAR,
  );
  const canReadGrants = hasObjectMetadataItem(
    readableObjectMetadataItems,
    BILAN_SAVED_SUBVENTION_OBJECT_NAME_SINGULAR,
  );

  if (canReadInvoices && canReadGrants) return <PendingBilanRecords />;
  if (canReadInvoices) return <PendingBilanInvoiceRecords />;
  if (canReadGrants) return <PendingBilanGrantRecords />;
  return <PendingBilanWidgetContent entries={[]} />;
};

// Query hooks resolve metadata before skipping a request. Mount only the
// readable sources so partial installations and restricted roles stay safe.
const usePendingBilanInvoices = () =>
  useFindManyRecords<HomeBilanInvoiceSummary & ObjectRecord>({
    objectNameSingular: BILAN_INVOICE_OBJECT_NAME_SINGULAR,
    filter: {
      and: [
        { status: { in: HOME_BILAN_PENDING_INVOICE_STATUSES } },
        { dueDate: { is: 'NOT_NULL' } },
      ],
    },
    orderBy: [{ dueDate: 'AscNullsFirst' }],
    limit: PENDING_BILAN_WIDGET_LIMIT,
    recordGqlFields: { id: true, number: true, status: true, dueDate: true },
  });

const usePendingBilanGrants = () =>
  useFindManyRecords<HomeBilanGrantSummary & ObjectRecord>({
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

const PendingBilanRecords = () => {
  const invoices = usePendingBilanInvoices();
  const grants = usePendingBilanGrants();
  return (
    <PendingBilanRecordsContent
      invoiceRecords={invoices.records}
      grantRecords={grants.records}
      isLoading={invoices.loading || grants.loading}
      hasError={Boolean(invoices.error || grants.error)}
      onRetry={() => {
        void invoices.refetch();
        void grants.refetch();
      }}
    />
  );
};

const PendingBilanInvoiceRecords = () => {
  const invoices = usePendingBilanInvoices();
  return (
    <PendingBilanRecordsContent
      invoiceRecords={invoices.records}
      isLoading={invoices.loading}
      hasError={Boolean(invoices.error)}
      onRetry={() => {
        void invoices.refetch();
      }}
    />
  );
};

const PendingBilanGrantRecords = () => {
  const grants = usePendingBilanGrants();
  return (
    <PendingBilanRecordsContent
      grantRecords={grants.records}
      isLoading={grants.loading}
      hasError={Boolean(grants.error)}
      onRetry={() => {
        void grants.refetch();
      }}
    />
  );
};

type PendingBilanRecordsContentProps = {
  invoiceRecords?: HomeBilanInvoiceSummary[];
  grantRecords?: HomeBilanGrantSummary[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
};

const PendingBilanRecordsContent = ({
  invoiceRecords = [],
  grantRecords = [],
  isLoading,
  hasError,
  onRetry,
}: PendingBilanRecordsContentProps) => {
  const { t } = useLingui();
  const now = useMemo(() => new Date(), []);
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const items = selectPendingBilanItems(
    {
      invoices: invoiceRecords,
      grants: grantRecords,
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
      isBilanInstalled
      isLoading={isLoading}
      hasError={hasError}
      onRetry={onRetry}
    />
  );
};
