import { defineApplication } from 'twenty-sdk/define';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from './constants/universal-identifiers.ts';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'A2E CRM',
  description:
    'Actions IA du CRM natif : brouillons de réponse e-mail et assistance d’enrichissement de fiche, en lecture seule et sous revue humaine',
});
