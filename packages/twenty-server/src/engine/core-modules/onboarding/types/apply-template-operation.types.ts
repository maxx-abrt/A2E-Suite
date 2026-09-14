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

export type TemplatePreview = {
  templateKey: string;
  version: number;
  apps: TemplatePreviewApp[];
  navigationChanges: TemplatePreviewNavigationChange[];
  samples: Array<{ label: string; locale: string }>;
  blocked: boolean;
};
