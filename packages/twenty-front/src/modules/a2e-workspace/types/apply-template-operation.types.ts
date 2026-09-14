// Mirror of the server contract in
// packages/twenty-server/src/engine/core-modules/onboarding/types/apply-template-operation.types.ts
// (kept in sync; the generated metadata does not carry these types yet).

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

export type TemplatePreview = {
  templateKey: string;
  version: number;
  apps: TemplatePreviewApp[];
  navigationChanges: TemplatePreviewNavigationChange[];
  samples: TemplatePreviewSample[];
  blocked: boolean;
};
