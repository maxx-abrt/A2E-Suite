import { type DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { coreClient } from './utils/records.ts';
import {
  resolveCategoryLabel,
  retireLedgerRow,
  upsertLedgerRow,
} from './handlers/ledger-handler.ts';

type FinanceEntryRecord = {
  id: string;
  label?: string | null;
  entryType?: 'EXPENSE' | 'INCOME' | null;
  entryDate?: string | null;
  amount?: { amountMicros?: number; currencyCode?: string } | null;
  paymentMethod?: string | null;
  reference?: string | null;
  categoryId?: string | null;
  deletedAt?: string | null;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte',
  CASH: 'Espèces',
  CHECK: 'Chèque',
  DIRECT_DEBIT: 'Prélèvement',
  OTHER: 'Autre',
};

const handler = async (
  payload: DatabaseEventPayload<{
    recordId: string;
    properties: { after?: FinanceEntryRecord; before?: FinanceEntryRecord };
  }>,
) => {
  const eventName = payload.name ?? '';
  const record = payload.properties?.after ?? payload.properties?.before;
  const recordId = payload.recordId ?? record?.id;

  if (recordId === undefined) {
    return { skipped: 'no-record-id' };
  }

  if (
    eventName.endsWith('.deleted') ||
    eventName.endsWith('.destroyed') ||
    record?.deletedAt
  ) {
    const retired = await retireLedgerRow('FINANCE_ENTRY', recordId);

    return { retired };
  }

  if (record === undefined || record.entryDate === null) {
    return { skipped: 'no-date' };
  }

  const client = coreClient();

  const outcome = await upsertLedgerRow({
    sourceKind: 'FINANCE_ENTRY',
    sourceId: recordId,
    financeEntryId: recordId,
    entryDate: record.entryDate ?? new Date().toISOString(),
    entryType: record.entryType ?? 'EXPENSE',
    label: record.label ?? 'Mouvement sans libellé',
    amountMicros: record.amount?.amountMicros ?? 0,
    currencyCode: record.amount?.currencyCode ?? 'EUR',
    categoryLabel: await resolveCategoryLabel(client, record.categoryId),
    paymentMethodLabel:
      record.paymentMethod === null || record.paymentMethod === undefined
        ? ''
        : (PAYMENT_METHOD_LABELS[record.paymentMethod] ?? record.paymentMethod),
    reference: record.reference ?? undefined,
  });

  return { outcome };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.syncFinanceEntryToLedger,
  name: 'sync-finance-entry-to-ledger',
  description:
    "Écrit chaque dépense ou recette dans le journal automatique, avec sa provenance. Rejouable sans créer de doublon.",
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'financeEntry.*',
  },
  handler,
});
