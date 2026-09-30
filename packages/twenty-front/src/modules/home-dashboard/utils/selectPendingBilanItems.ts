export type HomeBilanInvoiceSummary = {
  id: string;
  number: string | null;
  status: string | null;
  dueDate: string | null;
};

export type HomeBilanGrantSummary = {
  id: string;
  name: string;
  status: string | null;
  deadline: string | null;
};

export type HomePendingBilanItemSource = 'invoice' | 'grant';

export type HomePendingBilanItem = {
  id: string;
  source: HomePendingBilanItemSource;
  title: string;
  deadline: string;
  isOverdue: boolean;
};

export const HOME_BILAN_PAID_INVOICE_STATUS = 'PAID';

export const HOME_BILAN_CANCELLED_INVOICE_STATUS = 'CANCELLED';

export const HOME_BILAN_ACTIVE_GRANT_STATUSES = ['SHORTLISTED', 'PREPARING'];

const getTimestamp = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
};

const isUnpaidInvoiceStatus = (status: string | null): boolean =>
  status !== HOME_BILAN_PAID_INVOICE_STATUS &&
  status !== HOME_BILAN_CANCELLED_INVOICE_STATUS;

// A grant stays "pending" while it is still a dossier to submit: once submitted
// or decided it no longer needs a Today nudge.
const isActiveGrantStatus = (status: string | null): boolean =>
  HOME_BILAN_ACTIVE_GRANT_STATUSES.includes(status ?? '');

// Both Bilan families land in ONE card, ordered by the nearest deadline, so the
// member sees the single most urgent money item first regardless of source.
export const selectPendingBilanItems = (
  {
    invoices,
    grants,
  }: {
    invoices: HomeBilanInvoiceSummary[];
    grants: HomeBilanGrantSummary[];
  },
  { now, limit }: { now: Date; limit: number },
): HomePendingBilanItem[] => {
  const invoiceItems: HomePendingBilanItem[] = invoices
    .filter(
      (invoice) =>
        isUnpaidInvoiceStatus(invoice.status) &&
        getTimestamp(invoice.dueDate) !== null,
    )
    .map((invoice) => {
      const deadline = invoice.dueDate as string;

      return {
        id: invoice.id,
        source: 'invoice',
        title: invoice.number ?? '',
        deadline,
        isOverdue: new Date(deadline).getTime() < now.getTime(),
      };
    });

  const grantItems: HomePendingBilanItem[] = grants
    .filter(
      (grant) =>
        isActiveGrantStatus(grant.status) &&
        getTimestamp(grant.deadline) !== null,
    )
    .map((grant) => {
      const deadline = grant.deadline as string;

      return {
        id: grant.id,
        source: 'grant',
        title: grant.name,
        deadline,
        isOverdue: new Date(deadline).getTime() < now.getTime(),
      };
    });

  return [...invoiceItems, ...grantItems]
    .sort(
      (firstItem, secondItem) =>
        new Date(firstItem.deadline).getTime() -
        new Date(secondItem.deadline).getTime(),
    )
    .slice(0, limit);
};
