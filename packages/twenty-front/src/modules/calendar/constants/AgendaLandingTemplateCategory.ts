import { type TemplateDescriptorCategory } from 'twenty-shared/application';

// The gallery category the Agenda home prefilters to. Agenda has no app; its
// six M9c descriptors are host-side and all tagged `Agenda` (US-142), so a
// featured link can never land on another family's category. Kept in its own
// file because the repo enforces one exported const per file.
export const AGENDA_LANDING_TEMPLATE_CATEGORY: TemplateDescriptorCategory =
  'Agenda';
