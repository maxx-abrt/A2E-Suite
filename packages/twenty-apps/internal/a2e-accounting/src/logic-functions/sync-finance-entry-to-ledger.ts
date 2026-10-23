import {
  type DatabaseEventPayload,
  defineLogicFunction,
} from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { coreClient } from './utils/records.ts';
import {
  resolveCategoryLabel,
  retireLedgerRow,
  upsertLedgerRow,
} from './handlers/ledger-handler.ts';

import {
  buildFinanceEntryLedgerInput,
  type FinanceEntryLedgerSource,
} from '../lib/ledger-source.ts';

const handler = async (
  payload: DatabaseEventPayload<{
    recordId: string;
    properties: {
      after?: FinanceEntryLedgerSource;
      before?: FinanceEntryLedgerSource;
    };
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

  if (record === undefined) return { skipped: 'no-record' };
  const ledgerInput = buildFinanceEntryLedgerInput(record, recordId);
  if (ledgerInput === null) {
    return {
      retired: await retireLedgerRow('FINANCE_ENTRY', recordId),
      skipped: 'incomplete-entry',
    };
  }

  const client = coreClient();

  const outcome = await upsertLedgerRow({
    ...ledgerInput,
    financeEntryId: recordId,
    categoryLabel: await resolveCategoryLabel(client, record.categoryId),
  });

  return { outcome };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.syncFinanceEntryToLedger,
  name: 'sync-finance-entry-to-ledger',
  description:
    'Écrit chaque dépense ou recette dans le journal automatique, avec sa provenance. Rejouable sans créer de doublon.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'financeEntry.*',
  },
  handler,
});
