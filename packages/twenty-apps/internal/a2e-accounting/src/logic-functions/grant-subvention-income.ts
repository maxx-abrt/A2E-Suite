import { type DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  coreClient,
  createRecords,
  findOneRecord,
  updateRecord,
} from './utils/records.ts';

// A granted subvention is real money: it becomes an income entry, which in turn
// lands in the auto-journal through the finance-entry trigger. Idempotent on
// the dossier id, so re-saving a granted dossier never books it twice.

type SavedSubventionRecord = {
  id: string;
  name?: string | null;
  status?: string | null;
  amountGranted?: { amountMicros?: number; currencyCode?: string } | null;
  decisionAt?: string | null;
};

const REFERENCE_PREFIX = 'SUBVENTION:';

const handler = async (
  payload: DatabaseEventPayload<{
    recordId: string;
    properties: { after?: SavedSubventionRecord };
  }>,
) => {
  const record = payload.properties?.after;
  const recordId = payload.recordId ?? record?.id;

  if (record === undefined || recordId === undefined) {
    return { skipped: 'no-record' };
  }

  const grantedMicros = record.amountGranted?.amountMicros ?? 0;

  if (record.status !== 'GRANTED' || grantedMicros <= 0) {
    return { skipped: 'not-granted' };
  }

  const client = coreClient();
  const reference = `${REFERENCE_PREFIX}${recordId}`;

  const existing = await findOneRecord<{ id: string }>(
    client,
    'financeEntries',
    { id: true },
    { reference: { eq: reference } },
  );

  const data = {
    label: `Subvention accordée — ${record.name ?? 'dossier'}`,
    entryType: 'INCOME',
    amount: {
      amountMicros: grantedMicros,
      currencyCode: record.amountGranted?.currencyCode ?? 'EUR',
    },
    entryDate: record.decisionAt ?? new Date().toISOString(),
    reference,
    savedSubventionId: recordId,
    isDeductible: false,
  };

  if (existing === undefined) {
    const [created] = await createRecords(client, 'createFinanceEntries', [
      data,
    ]);

    return { created: created?.id };
  }

  await updateRecord(client, 'updateFinanceEntry', existing.id, data);

  return { updated: existing.id };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.grantSubventionIncome,
  name: 'grant-subvention-income',
  description:
    'Crée la recette correspondant à une subvention accordée, liée au dossier, et la met à jour si le montant change.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'savedSubvention.updated',
    updatedFields: ['status', 'amountGranted', 'decisionAt'],
  },
  handler,
});
