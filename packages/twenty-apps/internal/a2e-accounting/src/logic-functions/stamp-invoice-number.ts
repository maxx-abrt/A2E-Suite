import { type DatabaseEventPayload, defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { stampInvoiceNumberIssued } from './handlers/numbering-handler.ts';

type InvoiceRecord = {
  id: string;
  number?: string | null;
  status?: string | null;
};

// Numérotation à l'émission. Le numéro est alloué par le serveur quand la
// facture quitte l'état brouillon — quel que soit le canal (UI, API, cron) —
// pour qu'aucun appelant ne puisse publier une facture sans numéro ou
// dédoublonné (article L102 B du LPF). La décision et l'allocation vivent dans
// le handler testable, comme pour les autres fonctions de Bilan.
const handler = async (
  payload: DatabaseEventPayload<{
    recordId: string;
    properties: { after?: InvoiceRecord };
  }>,
) => {
  const record = payload.properties?.after;
  const recordId = payload.recordId ?? record?.id;

  if (recordId === undefined || record === undefined) {
    return { skipped: 'no-record' };
  }

  return stampInvoiceNumberIssued(
    recordId,
    record,
    payload.name ?? '',
  );
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.stampInvoiceNumber,
  name: 'stamp-invoice-number',
  description:
    'Alloue le numéro séquentiel de facture (article L102 B) à l’émission, sans collision ni trou évitable, quel que soit le canal de création.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'invoice.*',
  },
  handler,
});
