import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// A named starter the Syna home features (M7f).
export type SynaLandingTemplateLink = {
  descriptorKey: string;
  label: MessageDescriptor;
};

// The three Syna starters the home features out of the seven READY M9c recipes.
// Each links into the shared template gallery, prefiltered to the Syna category
// (`SYNA_LANDING_TEMPLATE_CATEGORY`) and preselected to this exact descriptor.
// The keys must stay descriptors shipped READY by `SYNA_RECIPE_DESCRIPTORS`; the
// paired drift-guard spec fails if a key stops resolving, and the P7-gated
// invoice recipe is never a featured key because it is registry-only.
export const SYNA_LANDING_TEMPLATE_LINKS: SynaLandingTemplateLink[] = [
  { descriptorKey: 'syna-resume-page', label: msg`Summarize page` },
  { descriptorKey: 'syna-reunion-vers-taches', label: msg`Meeting to tasks` },
  { descriptorKey: 'syna-digest-hebdomadaire', label: msg`Weekly digest` },
];
