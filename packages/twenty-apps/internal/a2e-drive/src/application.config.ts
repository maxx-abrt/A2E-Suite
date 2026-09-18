import { defineApplication } from 'twenty-sdk/define';

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  'b11cd01f-75de-4acd-8e67-0e9c484fde02';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'A2E Drive',
  description:
    'Fichiers de l’espace de travail : dossiers arborescents et organisation additive des pièces jointes existantes',
});
