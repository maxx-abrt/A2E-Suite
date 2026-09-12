import { defineCommandMenuItem } from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';

// Cmd+K action: creates a project with the typed name and opens its record
// page. The front component resolves via the id constant (cross-family
// imports fail to bundle — same constraint as a2e-documents' create command).
export default defineCommandMenuItem({
  universalIdentifier: 'c31a0000-0011-4000-8000-000000000004',
  label: 'A2E Projects : créer un projet',
  shortLabel: 'Créer un projet',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.createProjectCommand,
});
