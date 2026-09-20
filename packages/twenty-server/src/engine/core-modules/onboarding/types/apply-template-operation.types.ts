// Setup-operation contract from docs/plan/05-template-contracts.md §4–§6.
// Shapes are normative; keep in sync with the GraphQL DTOs next to the
// onboarding resolver when the schema is regenerated.

export type OperationStepKind =
  | 'install-app'
  | 'navigation-visibility'
  | 'seed-samples'
  | 'set-workspace-template';

export type OperationStepStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export type OperationStepErrorCode =
  | 'APP_NOT_REGISTERED'
  | 'VERSION_INCOMPATIBLE'
  | 'INSTALL_FAILED'
  | 'NAVIGATION_FAILED'
  | 'SEED_FAILED';

export type ApplyTemplateStep = {
  kind: OperationStepKind;
  targetUniversalIdentifier?: string;
  status: OperationStepStatus;
  createdRecordUniversalIdentifiers?: string[];
  errorCode?: OperationStepErrorCode;
  localizedMessage?: string;
};

export type TemplateKeyVersion = {
  key: string;
  version: number;
};

export type ApplyTemplateResult = {
  operationId: string;
  requestedTemplateKeyVersion: TemplateKeyVersion | null;
  appliedTemplateKeyVersion: TemplateKeyVersion | null;
  steps: ApplyTemplateStep[];
};

export type TemplatePreviewApp = {
  universalIdentifier: string;
  displayName: string;
  registered: boolean;
  versionCompatible: boolean;
  required: boolean;
  currentlyInstalled: boolean;
};

export type TemplatePreviewNavigationChange = {
  universalIdentifier: string;
  action: 'hide' | 'restore';
};

export type TemplatePreviewSample = {
  label: string;
  locale: string;
};

// Proposed content a persona would seed but that is deferred behind an upstream
// gate: surfaced so the preview records the exclusion instead of dropping it.
export type TemplatePreviewBlockedSample = TemplatePreviewSample & {
  blockedBy: string;
};

// Preview/apply failure discriminator (C2): a client must be able to tell "no
// apps available" from a permission denial instead of collapsing both into one
// generic "unavailable" state. The server produces only the catalogue states;
// the client adds NETWORK_ERROR for a fetch that never reached the server.
export type ApplyTemplateErrorCode = 'PERMISSION_DENIED' | 'NO_APPS_AVAILABLE';

export type TemplatePreview = {
  templateKey: string;
  version: number;
  apps: TemplatePreviewApp[];
  navigationChanges: TemplatePreviewNavigationChange[];
  samples: TemplatePreviewSample[];
  blockedSamples: TemplatePreviewBlockedSample[];
  blocked: boolean;
  errorCode?: ApplyTemplateErrorCode | null;
};
