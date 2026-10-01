import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// A named starter the Bureau home features (M7f).
export type BureauLandingTemplateLink = {
  descriptorKey: string;
  label: MessageDescriptor;
};

// The three starter pages the Bureau home features (M7f). Each links into the
// shared template gallery, prefiltered to the Bureau ("Pages") category
// (`BureauLandingTemplateCategory`) and preselected to this exact descriptor.
// The keys are C1 descriptor keys shipped by a2e-documents; its
// `bureau-landing-template-links` spec reads this file and fails if a key stops
// resolving to a shipped descriptor, so a rename on either side cannot drift
// silently.
export const BUREAU_LANDING_TEMPLATE_LINKS: BureauLandingTemplateLink[] = [
  { descriptorKey: 'notes-de-reunion', label: msg`Meeting notes` },
  { descriptorKey: 'brief-de-projet', label: msg`Project brief` },
  { descriptorKey: 'okr', label: msg`OKRs` },
];
