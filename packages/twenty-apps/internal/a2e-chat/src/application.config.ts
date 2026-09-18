import { defineApplication } from 'twenty-sdk/define';

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  'e2dce399-87f1-4548-b307-5f368b4d5dd4';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'A2E Chat',
  description:
    'Chat natif de l’espace de travail : canaux workspace/projet/à la demande, fils, réactions et compteurs de lecture',
});
