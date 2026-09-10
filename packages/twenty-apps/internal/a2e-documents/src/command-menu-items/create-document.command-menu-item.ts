import { defineCommandMenuItem } from 'twenty-sdk/define';

import { DOCUMENT_BROWSER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../front-components/constants.ts';

export default defineCommandMenuItem({
  universalIdentifier: 'c31a0000-0011-4000-8000-000000000001',
  label: 'A2E Documents : créer un document',
  shortLabel: 'Créer un document',
  availabilityType: 'GLOBAL',
  isPinned: true,
  frontComponentUniversalIdentifier:
    DOCUMENT_BROWSER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
