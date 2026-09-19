import {
  type TemplatePreview,
  type TemplatePreviewApp,
  type TemplatePreviewNavigationChange,
  type TemplatePreviewSample,
} from '@/a2e-workspace/types/apply-template-operation.types';

// Resolved per-app outcome of a previewed template, matching
// docs/plan/05-template-contracts.md §6 (`currentlyInstalled` = install/keep
// distinction, missing registration/version = unavailable).
export type TemplatePreviewAppResolution = 'install' | 'keep' | 'unavailable';

export type ResolvedTemplatePreviewApp = {
  universalIdentifier: string;
  displayName: string;
  required: boolean;
  optional: boolean;
  registered: boolean;
  versionCompatible: boolean;
  available: boolean;
  currentlyInstalled: boolean;
  excluded: boolean;
  resolution: TemplatePreviewAppResolution;
};

export type ResolvedTemplatePreview = {
  templateKey: string;
  version: number;
  apps: ResolvedTemplatePreviewApp[];
  // Required apps this server cannot satisfy. They alone block an apply;
  // an unavailable optional app stays excludable (C1/C2 §6).
  prerequisites: ResolvedTemplatePreviewApp[];
  navigationChanges: TemplatePreviewNavigationChange[];
  samples: TemplatePreviewSample[];
  blocked: boolean;
};

export const isTemplatePreviewAppAvailable = (
  previewApp: TemplatePreviewApp,
): boolean => previewApp.registered && previewApp.versionCompatible;

export const resolveTemplatePreviewApp = (
  previewApp: TemplatePreviewApp,
  deselectedOptionalAppUniversalIdentifiers: readonly string[],
): ResolvedTemplatePreviewApp => {
  const optional = !previewApp.required;
  const available = isTemplatePreviewAppAvailable(previewApp);
  const excluded =
    optional &&
    deselectedOptionalAppUniversalIdentifiers.includes(
      previewApp.universalIdentifier,
    );

  const resolution: TemplatePreviewAppResolution = !available
    ? 'unavailable'
    : previewApp.currentlyInstalled
      ? 'keep'
      : 'install';

  return {
    universalIdentifier: previewApp.universalIdentifier,
    displayName: previewApp.displayName,
    required: previewApp.required,
    optional,
    registered: previewApp.registered,
    versionCompatible: previewApp.versionCompatible,
    available,
    currentlyInstalled: previewApp.currentlyInstalled,
    excluded,
    resolution,
  };
};

export const resolveTemplatePreview = (
  preview: TemplatePreview,
  deselectedOptionalAppUniversalIdentifiers: readonly string[],
): ResolvedTemplatePreview => {
  const apps = preview.apps.map((previewApp) =>
    resolveTemplatePreviewApp(
      previewApp,
      deselectedOptionalAppUniversalIdentifiers,
    ),
  );

  return {
    templateKey: preview.templateKey,
    version: preview.version,
    apps,
    prerequisites: apps.filter(
      (resolvedApp) => resolvedApp.required && !resolvedApp.available,
    ),
    navigationChanges: preview.navigationChanges,
    samples: preview.samples,
    blocked: preview.blocked,
  };
};
