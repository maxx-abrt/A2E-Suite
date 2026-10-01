import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// A named starter the Agenda home features (M7f).
export type AgendaLandingTemplateLink = {
  descriptorKey: string;
  label: MessageDescriptor;
};

// The three Agenda starters the home features out of the six M9c family
// templates. Each links into the shared template gallery, prefiltered to the
// Agenda category (`AGENDA_LANDING_TEMPLATE_CATEGORY`) and preselected to this
// exact descriptor. The keys must stay descriptors shipped by
// `AGENDA_TEMPLATE_DESCRIPTORS`; the paired drift-guard spec fails if a key
// stops resolving, so a rename on either side cannot drift silently.
export const AGENDA_LANDING_TEMPLATE_LINKS: AgendaLandingTemplateLink[] = [
  {
    descriptorKey: 'agenda-blocage-temps-semaine',
    label: msg`Weekly time-block`,
  },
  { descriptorKey: 'agenda-rituels-equipe', label: msg`Team rituals` },
  {
    descriptorKey: 'agenda-calendrier-editorial',
    label: msg`Editorial calendar`,
  },
];
