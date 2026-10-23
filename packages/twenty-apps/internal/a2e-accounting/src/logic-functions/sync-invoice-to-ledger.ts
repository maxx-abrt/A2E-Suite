import {
  type DatabaseEventPayload,
  defineLogicFunction,
} from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { retireLedgerRow, upsertLedgerRow } from './handlers/ledger-handler.ts';

import {
  buildInvoiceLedgerInput,
  type InvoiceLedgerSource,
} from '../lib/ledger-source.ts';

const handler = async (
  payload: DatabaseEventPayload<{
    recordId: string;
    properties: { after?: InvoiceLedgerSource; before?: InvoiceLedgerSource };
  }>,
) => {
  const eventName = payload.name ?? '';
  const record = payload.properties?.after ?? payload.properties?.before;
  const recordId = payload.recordId ?? record?.id;

  if (recordId === undefined || record === undefined) {
    return { skipped: 'no-record' };
  }

  const ledgerInput = buildInvoiceLedgerInput(record, recordId);

  if (
    eventName.endsWith('.deleted') ||
    eventName.endsWith('.destroyed') ||
    record.deletedAt ||
    ledgerInput === null
  ) {
    const retired = await retireLedgerRow('INVOICE', recordId);

    return { retired };
  }

  const outcome = await upsertLedgerRow({
    ...ledgerInput,
    invoiceId: recordId,
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
