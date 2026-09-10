import { type DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { retireLedgerRow, upsertLedgerRow } from './handlers/ledger-handler.ts';

type InvoiceRecord = {
  id: string;
  number?: string | null;
  status?: string | null;
  clientName?: string | null;
  paidDate?: string | null;
  issueDate?: string | null;
  amountPaid?: { amountMicros?: number; currencyCode?: string } | null;
  deletedAt?: string | null;
};

// Cash accounting: an invoice enters the book when it is actually paid, not
// when it is issued. A draft or a merely sent invoice writes nothing.
const isCashed = (record: InvoiceRecord): boolean =>
  (record.amountPaid?.amountMicros ?? 0) > 0 &&
  (record.status === 'PAID' || record.status === 'PARTIALLY_PAID');

const handler = async (
  payload: DatabaseEventPayload<{
    recordId: string;
    properties: { after?: InvoiceRecord; before?: InvoiceRecord };
  }>,
) => {
  const eventName = payload.name ?? '';
  const record = payload.properties?.after ?? payload.properties?.before;
  const recordId = payload.recordId ?? record?.id;

  if (recordId === undefined || record === undefined) {
    return { skipped: 'no-record' };
  }

  if (
    eventName.endsWith('.deleted') ||
    eventName.endsWith('.destroyed') ||
    record.deletedAt ||
    !isCashed(record)
  ) {
    const retired = await retireLedgerRow('INVOICE', recordId);

    return { retired };
  }

  const outcome = await upsertLedgerRow({
    sourceKind: 'INVOICE',
    sourceId: recordId,
    invoiceId: recordId,
    entryDate:
      record.paidDate ?? record.issueDate ?? new Date().toISOString(),
    entryType: 'INCOME',
    label: `Facture ${record.number ?? ''} — ${record.clientName ?? 'client'}`.trim(),
    amountMicros: record.amountPaid?.amountMicros ?? 0,
    currencyCode: record.amountPaid?.currencyCode ?? 'EUR',
    categoryLabel: 'Ventes',
    paymentMethodLabel: '',
    reference: record.number ?? undefined,
  });

  return { outcome };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.syncInvoiceToLedger,
  name: 'sync-invoice-to-ledger',
  description:
    'Écrit au journal automatique le montant réellement encaissé d’une facture, et retire la ligne si l’encaissement disparaît.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'invoice.*',
  },
  handler,
});
