import { defineCommandMenuItem } from 'twenty-sdk/define';

import { DOCUMENT_BROWSER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../front-components/constants.ts';

export default defineCommandMenuItem({
  universalIdentifier: 'c31a0000-0011-4000-8000-000000000002',
  label: 'Bureau : aller aux documents',
  shortLabel: 'Documents',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier:
    DOCUMENT_BROWSER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
