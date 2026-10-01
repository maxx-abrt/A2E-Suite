import { defineApplication } from 'twenty-sdk/define';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from './constants/universal-identifiers.ts';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'A2E Links',
  description:
    'Liens universels (D-M11A-LINK) : une jonction a2eLink relie tout enregistrement déclaré à tout autre en réutilisant la relation morph native. Le consommateur déclare les deux côtés ; les apps propriétaires des objets cibles doivent être installées avant.',
});
