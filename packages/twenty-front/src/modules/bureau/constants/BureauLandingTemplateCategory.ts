import { type TemplateDescriptorCategory } from 'twenty-shared/application';

// The gallery category the Bureau landing prefilters to: a2e-documents ships
// its page starters as `Pages` descriptors (M9), so a Bureau template link can
// never land on another app's category. Kept in its own file because the repo
// enforces one exported const per file.
export const BUREAU_LANDING_TEMPLATE_CATEGORY: TemplateDescriptorCategory =
  'Pages';
