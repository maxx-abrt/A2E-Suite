import { defineLogicFunction } from 'twenty-sdk/define';

import { isOverdue } from '../lib/recurrence.ts';
import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  coreClient,
  findAllRecords,
  updateRecord,
} from './utils/records.ts';

// Overdue sweep. Only invoices that are actually late and not fully paid are
// flipped, so a status the user set by hand (cancelled, paid) is never
// overwritten by the cron.

type InvoiceRecord = {
  id: string;
  number?: string | null;
  status?: string | null;
  dueDate?: string | null;
};

const handler = async () => {
  const client = coreClient();

  const invoices = await findAllRecords<InvoiceRecord>(
    client,
    'invoices',
    { id: true, number: true, status: true, dueDate: true },
    { filter: { status: { in: ['SENT', 'PARTIALLY_PAID'] } } },
  );

  const late = invoices.filter(
    (invoice) =>
      typeof invoice.dueDate === 'string' && isOverdue(invoice.dueDate),
  );

  for (const invoice of late) {
    await updateRecord(client, 'updateInvoice', invoice.id, {
      status: 'OVERDUE',
    });
  }

  console.log('[bilan] Factures passées en retard', { count: late.length });

  return { checked: invoices.length, markedOverdue: late.length };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.sweepOverdueInvoices,
  name: 'sweep-overdue-invoices',
  description:
    'Passe en retard chaque matin les factures envoyées dont l’échéance est dépassée et qui ne sont pas soldées.',
  timeoutSeconds: 120,
  cronTriggerSettings: {
    pattern: '30 5 * * *',
  },
  handler,
});
