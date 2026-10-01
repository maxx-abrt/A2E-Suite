import { type TemplateDescriptorCategory } from 'twenty-shared/application';

// The gallery category the Syna home prefilters to. Syna is a host surface with
// no app; its seven READY recipes are tagged `Syna` (US-143), so a featured link
// can never land on another family's category. Kept in its own file because the
// repo enforces one exported const per constants file.
export const SYNA_LANDING_TEMPLATE_CATEGORY: TemplateDescriptorCategory =
  'Syna';
