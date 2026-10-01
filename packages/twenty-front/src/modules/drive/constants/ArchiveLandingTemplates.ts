import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// A named starter the Archive home features (M7f).
export type ArchiveLandingTemplateLink = {
  descriptorKey: string;
  label: MessageDescriptor;
};

// The three Archive folder-structure starters the home features out of the four
// M9c family templates. Each links into the shared template gallery,
// prefiltered to the Archive category (`ARCHIVE_LANDING_TEMPLATE_CATEGORY`) and
// preselected to this exact descriptor. The keys must stay descriptors shipped
// by a2e-drive's `buildFolderStructureDescriptors`; the paired drift-guard spec
// fails if a key stops resolving, so a rename on either side cannot drift
// silently.
export const ARCHIVE_LANDING_TEMPLATE_LINKS: ArchiveLandingTemplateLink[] = [
  { descriptorKey: 'CLIENT', label: msg`Client folders` },
  { descriptorKey: 'ASSOCIATION', label: msg`Association folders` },
  {
    descriptorKey: 'ADMINISTRATION_ENTREPRISE',
    label: msg`Company administration folders`,
  },
];
