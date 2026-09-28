import { defineApplication } from 'twenty-sdk/define';

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  '4f759655-84f8-434d-9c76-ee1850e8c1a4';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Bureau Projets',
  description:
    'Bureau — projets et tâches : tableaux, statuts, gantt et suivi du temps sur le moteur de tâches natif',
});
