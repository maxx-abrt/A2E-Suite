// C1 — the content-template descriptor contract (PLAN M9a).
//
// Every A2E app exposes the templates it ships through ONE shape: this
// descriptor. The gallery (M9a-2) and the workspace presets (M9d) read the same
// fields, so a template is described once and never re-declared per consumer.
//
// A descriptor is pure data: it names what a template IS (key, version, fr+en
// labels, category), what applying it REQUIRES (requiredApps), what it lets the
// user fill in (inputs) and what it WILL write before anything is written
// (preview — the C1 §6 rule "show what will be created"). Built-in templates
// stay in each app's lib constants; there is no engine and no table for them.

export type TemplateDescriptorLabels = {
  fr: string;
  en: string;
};

// The closed set of categories the M9c families populate. A descriptor's
// category is a display grouping in the gallery, not an app identity — several
// apps may share one, and one app may show under several.
export type TemplateDescriptorCategory =
  | 'Pages'
  | 'Projets'
  | 'Bilan'
  | 'Archive'
  | 'Agenda'
  | 'Automatisations';

// A user-fillable field the gallery renders before applying the template. The
// keys are free-form and template-specific; `required` drives the gallery's
// "Use template" enablement.
export type TemplateDescriptorInput = {
  key: string;
  label: TemplateDescriptorLabels;
  required: boolean;
};

// One write a template performs when applied, declared BEFORE apply. `object`
// is the target object's name_singular (e.g. 'document', 'project',
// 'driveFolder'); `count` is how many rows of that object the apply creates.
export type TemplateDescriptorPreviewWrite = {
  object: string;
  summary: TemplateDescriptorLabels;
  count: number;
};

export type TemplateDescriptor = {
  // Stable identity, unique across the whole A2E suite. Changing what a
  // template creates means a new version, never a new key.
  key: string;
  version: number;
  labels: TemplateDescriptorLabels;
  category: TemplateDescriptorCategory;
  // Every write the apply performs, declared before anything is written so the
  // gallery preview pane can show exactly what will be created.
  preview: TemplateDescriptorPreviewWrite[];
  // Apps that must be installed for the template's writes to land (the same
  // identity as the app's `requiredApps` in the manifest).
  requiredApps: string[];
  inputs: TemplateDescriptorInput[];
};

export type TemplateDescriptorValidation = {
  valid: boolean;
  errors: string[];
};
