import { defineLogicFunction } from 'twenty-sdk/define';

import { dueOccurrences, type Recurrence } from '../lib/recurrence.ts';
import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  coreClient,
  createRecords,
  findAllRecords,
  type RecordShape,
  updateRecord,
} from './utils/records.ts';

// Recurring movements. Each generated row carries a provenance reference keyed
// on the template and the occurrence date, so a generator that was offline for
// a month catches up without ever writing the same occurrence twice.

type RecurringEntry = {
  id: string;
  label?: string | null;
  entryType?: string | null;
  amount?: { amountMicros?: number; currencyCode?: string } | null;
  paymentMethod?: string | null;
  categoryId?: string | null;
  recurrence?: Recurrence | null;
  nextOccurrenceDate?: string | null;
  isRecurring?: boolean | null;
  vatRate?: number | null;
};

const occurrenceReference = (templateId: string, day: string): string =>
  `RECURRING:${templateId}:${day}`;

const handler = async () => {
  const client = coreClient();
  const now = new Date();

  const templates = await findAllRecords<RecurringEntry>(
    client,
    'financeEntries',
    {
      id: true,
      label: true,
      entryType: true,
      amount: { amountMicros: true, currencyCode: true },
      paymentMethod: true,
      categoryId: true,
      recurrence: true,
      nextOccurrenceDate: true,
      isRecurring: true,
      vatRate: true,
    },
    { filter: { isRecurring: { eq: true } } },
  );

  const existingReferences = new Set(
    (
      await findAllRecords<{ reference?: string | null }>(
        client,
        'financeEntries',
        { reference: true },
        { filter: { reference: { startsWith: 'RECURRING:' } } },
      )
    )
      .map((entry) => entry.reference)
      .filter((reference): reference is string => typeof reference === 'string'),
  );

  let generated = 0;

  for (const template of templates) {
    if (
      template.recurrence === null ||
      template.recurrence === undefined ||
      template.nextOccurrenceDate === null ||
      template.nextOccurrenceDate === undefined
    ) {
      continue;
    }

    const occurrences = dueOccurrences(
      new Date(template.nextOccurrenceDate),
      template.recurrence,
      now,
    );

    if (occurrences.length === 0) {
      continue;
    }

    const rows: RecordShape[] = [];

    for (const occurrence of occurrences) {
      const day = occurrence.toISOString().slice(0, 10);
      const reference = occurrenceReference(template.id, day);

      if (existingReferences.has(reference)) {
        continue;
      }

      existingReferences.add(reference);
      rows.push({
        label: template.label ?? 'Mouvement récurrent',
        entryType: template.entryType ?? 'EXPENSE',
        amount: template.amount ?? { amountMicros: 0, currencyCode: 'EUR' },
        entryDate: occurrence.toISOString(),
        paymentMethod: template.paymentMethod ?? null,
        categoryId: template.categoryId ?? null,
        vatRate: template.vatRate ?? null,
        reference,
        isRecurring: false,
      });
    }

    if (rows.length > 0) {
      await createRecords(client, 'createFinanceEntries', rows);
      generated += rows.length;
    }

    const lastOccurrence = occurrences[occurrences.length - 1];

    await updateRecord(client, 'updateFinanceEntry', template.id, {
      nextOccurrenceDate: new Date(
        lastOccurrence.getTime() + 1,
      ).toISOString(),
    });
  }

  console.log('[bilan] Mouvements récurrents générés', { generated });

  return { templates: templates.length, generated };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.generateRecurringDocuments,
  name: 'generate-recurring-documents',
  description:
    'Génère chaque matin les échéances des dépenses et recettes récurrentes, en rattrapant les occurrences manquées sans doublon.',
  timeoutSeconds: 180,
  cronTriggerSettings: {
    pattern: '45 5 * * *',
  },
  handler,
});
