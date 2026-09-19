import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  assistRecordEnrichment,
  type RecordEnrichmentAssistResult,
} from './handlers/assist-record-enrichment-handler.ts';

export type { RecordEnrichmentAssistResult } from './handlers/assist-record-enrichment-handler.ts';

// AI tool (P9.2): « assistance d’enrichissement de fiche ».
//
// Reads one caller-authorized person or company record and reports which key
// fields are empty, so the assistant proposes enrichment values for review.
// This tool reuses the existing enrichment path by design: it neither calls an
// enrichment provider nor writes, leaving `people-data-labs` / the native
// company-enrichment module as the single place enrichment is applied (C6).
// Registered on the native registry through `toolTriggerSettings` (P1.5) — no
// `registerAiTools`, no new table, no manual hook.

const handler = async (params: {
  personId?: string;
  companyId?: string;
}): Promise<RecordEnrichmentAssistResult> => assistRecordEnrichment(params);

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.assistRecordEnrichment,
  name: 'assist-record-enrichment',
  description:
    'Lit une fiche personne ou entreprise autorisée et indique les champs d’identité vides pour que l’assistant propose des valeurs à enrichir. Lecture seule : aucun fournisseur d’enrichissement n’est appelé et aucune fiche n’est modifiée — l’enrichissement existant reste la seule voie d’écriture.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'La fiche à enrichir : exactement un identifiant, personne ou entreprise.',
      properties: {
        personId: {
          type: 'string',
          description: 'Identifiant de la personne à enrichir (optionnel).',
        },
        companyId: {
          type: 'string',
          description: 'Identifiant de l’entreprise à enrichir (optionnel).',
        },
      },
    },
  },
  handler,
});
