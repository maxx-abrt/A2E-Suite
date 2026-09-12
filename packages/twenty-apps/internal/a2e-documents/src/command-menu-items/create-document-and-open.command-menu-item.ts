import { defineCommandMenuItem } from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';

// Cmd+K action distinct from the pinned browser shortcut: this one creates a
// document with the current search text and opens its record page directly.
// Referenced via the id constant, not the front-component module: manifest
// extraction resolves each file family separately, so a cross-family import
// fails to bundle.
export default defineCommandMenuItem({
  universalIdentifier: 'c31a0000-0011-4000-8000-000000000003',
  label: 'A2E Documents : créer un document',
  shortLabel: 'Créer et ouvrir un document',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.createDocumentCommand,
});
