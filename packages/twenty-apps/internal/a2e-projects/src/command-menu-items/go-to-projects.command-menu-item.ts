import { defineCommandMenuItem } from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';

export default defineCommandMenuItem({
  universalIdentifier: 'c31a0000-0011-4000-8000-000000000005',
  label: 'A2E Projects : aller aux projets',
  shortLabel: 'Projets',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.goToProjects,
});
