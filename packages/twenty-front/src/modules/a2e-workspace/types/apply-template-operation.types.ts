// Wire mirror of the server contract in
// packages/twenty-server/src/engine/core-modules/onboarding/types/apply-template-operation.types.ts.
// The server stores lower-case internal values but registers the enums with
// registerEnumType, so GraphQL serializes the MEMBER NAMES — these are the
// values the API actually returns. (GraphQL enum value names cannot contain
// hyphens, so the lower-case server values are not reachable over the wire.)

export type OperationStepKind =
  | 'INSTALL_APP'
  | 'NAVIGATION_VISIBILITY'
  | 'SEED_SAMPLES'
  | 'SET_WORKSPACE_TEMPLATE';

export type OperationStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'SKIPPED';

export type OperationStepErrorCode =
  | 'APP_NOT_REGISTERED'
  | 'VERSION_INCOMPATIBLE'
  | 'INSTALL_FAILED'
  | 'NAVIGATION_FAILED'
  | 'SEED_FAILED';

export type ApplyTemplateStep = {
  kind: OperationStepKind;
  targetUniversalIdentifier?: string | null;
  status: OperationStepStatus;
  errorCode?: OperationStepErrorCode | null;
  localizedMessage?: string | null;
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

export type TemplatePreviewBlockedSample = TemplatePreviewSample & {
  blockedBy: string;
};

// Distinct failure surfaces for the unified setup operation (C2): "no apps
// available", a network failure and a permission denial must never collapse
// into one generic "unavailable" state. The server emits the catalogue states;
// NETWORK_ERROR is added client-side for a fetch that never reached the server.
export type ApplyTemplateErrorCode =
  | 'PERMISSION_DENIED'
  | 'NO_APPS_AVAILABLE'
  | 'NETWORK_ERROR';

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
