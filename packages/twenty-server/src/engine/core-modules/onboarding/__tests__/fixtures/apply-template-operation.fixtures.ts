// Machine-checked examples from docs/plan/05-template-contracts.md §7. The doc's
// JSON blocks mirror these values; the conformance spec
// (`apply-template-operation-fixtures.spec.ts`) fails when the source-of-truth
// constants in onboarding/constants drift.
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';
import { OnboardingExceptionCode } from 'src/engine/core-modules/onboarding/onboarding.exception';
import {
  type ApplyTemplateResult,
  type OperationStepErrorCode,
  type TemplatePreview,
} from 'src/engine/core-modules/onboarding/types/apply-template-operation.types';

// §7's content-descriptor rejections land with the P1.6e descriptor loader and
// are deliberately not members of OperationStepErrorCode / OnboardingExceptionCode
// (a step code for a pre-step failure would make the typed surface lie).
export type TemplateContentRejectionCode =
  | 'TEMPLATE_CONTENT_CROSS_WORKSPACE'
  | 'TEMPLATE_CONTENT_CYCLE';

export type TemplateContractRejectionCode =
  | OperationStepErrorCode
  | OnboardingExceptionCode
  | TemplateContentRejectionCode;

export type TemplateRejectionStage =
  | 'pre-step'
  | 'step-failure'
  | 'idempotent-replay'
  | 'descriptor-load';

// Mirrors the implemented negative-deselect input (contract §4 2026-09-17 note),
// not the doc's abstract positive `selectedAppUniversalIdentifiers` form.
export type ApplyTemplateRequestFixture = {
  templateKey: string;
  templateVersion?: number;
  deselectedOptionalAppUniversalIdentifiers?: string[];
  sampleContentEnabled?: boolean;
  idempotencyKey?: string;
};

// P1.6e content-template reference: node keys + universal identifiers only —
// never a workspace record ID, user ID, share URL or token (C1 §3).
export type TemplateContentReferenceFixture = {
  sourceNodeKey: string;
  targetNodeKey: string;
  targetUniversalIdentifier: string;
};

export type TemplateContentDescriptorFixture = {
  descriptorKey: string;
  version: number;
  // 'workspace-record' is the invalid reference kind the loader must reject; the
  // fixture marks it symbolically instead of embedding a real record ID.
  referenceKind: 'universal-identifier' | 'workspace-record';
  references: TemplateContentReferenceFixture[];
};

export type TemplateRejectionFixture = {
  matrixRow: string;
  stage: TemplateRejectionStage;
  request?: ApplyTemplateRequestFixture;
  contentDescriptor?: TemplateContentDescriptorFixture;
  // Empty only for the idempotent-replay row, which is not an error.
  expectedCodes: TemplateContractRejectionCode[];
};

// §7 preview example: individual template on a fresh workspace, a2e-documents
// 0.2.0 compatible and not yet installed.
export const individualTemplatePreview: TemplatePreview = {
  templateKey: WorkspaceTemplate.INDIVIDUAL,
  version: 1,
  apps: [
    {
      universalIdentifier: '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
      displayName: 'A2E Documents',
      registered: true,
      versionCompatible: true,
      required: true,
      currentlyInstalled: false,
    },
  ],
  navigationChanges: [
    {
      universalIdentifier: '20202020-b001-4b01-8b01-c0aba11c0001',
      action: 'hide',
    },
    {
      universalIdentifier: '20202020-b005-4b05-8b05-c0aba11c0005',
      action: 'hide',
    },
    {
      universalIdentifier: '20202020-b004-4b04-8b04-c0aba11c0004',
      action: 'hide',
    },
  ],
  // P1.6d persona bundle: A2E Documents is registered and compatible, so its
  // proposed starter content is previewed.
  samples: [
    { label: 'Notes de réunion', locale: 'fr' },
    { label: 'Entretien individuel', locale: 'fr' },
  ],
  // The individual persona proposes no gated content.
  blockedSamples: [],
  blocked: false,
};

// §7 result example: final report after a required-app install failure and a
// successful retry of the remaining steps (the retried install now succeeds).
export const individualTemplateApplyResult: ApplyTemplateResult = {
  operationId: '9f1c3a20-8f4e-4d9a-9c1e-2b6a7d8e9f01',
  requestedTemplateKeyVersion: {
    key: WorkspaceTemplate.INDIVIDUAL,
    version: 1,
  },
  appliedTemplateKeyVersion: { key: WorkspaceTemplate.INDIVIDUAL, version: 1 },
  steps: [
    {
      kind: 'install-app',
      targetUniversalIdentifier: '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
      status: 'succeeded',
    },
    { kind: 'navigation-visibility', status: 'succeeded' },
    { kind: 'seed-samples', status: 'skipped' },
    { kind: 'set-workspace-template', status: 'succeeded' },
  ],
};

const IDEMPOTENCY_KEY = '3f4e5d6c-7b8a-4c9d-8e0f-1a2b3c4d5e6f';
const A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';
// Synthetic identifier, intentionally absent from every template definition.
const UNKNOWN_APP_UNIVERSAL_IDENTIFIER = '20202020-ffff-4fff-8fff-c0aba11cffff';
const CYCLE_NODE_A_UNIVERSAL_IDENTIFIER =
  'a1b2c3d4-0001-4000-8000-000000000001';
const CYCLE_NODE_B_UNIVERSAL_IDENTIFIER =
  'a1b2c3d4-0002-4000-8000-000000000002';

// One fixture per row of §7's rejection matrix, in matrix order.
export const templateRejectionFixtures: TemplateRejectionFixture[] = [
  {
    matrixRow: 'Unknown templateKey',
    stage: 'pre-step',
    request: { templateKey: 'unknown-preset' },
    expectedCodes: [OnboardingExceptionCode.TEMPLATE_UNKNOWN],
  },
  {
    matrixRow: 'Version differs from the previewed one',
    stage: 'pre-step',
    request: { templateKey: WorkspaceTemplate.INDIVIDUAL, templateVersion: 99 },
    expectedCodes: [OnboardingExceptionCode.TEMPLATE_VERSION_CONFLICT],
  },
  {
    matrixRow: 'Selected/deselected app not in template definition',
    stage: 'pre-step',
    request: {
      templateKey: WorkspaceTemplate.INDIVIDUAL,
      deselectedOptionalAppUniversalIdentifiers: [
        UNKNOWN_APP_UNIVERSAL_IDENTIFIER,
      ],
    },
    expectedCodes: [OnboardingExceptionCode.TEMPLATE_APP_NOT_IN_DEFINITION],
  },
  {
    matrixRow: 'Deselect a required app',
    stage: 'pre-step',
    request: {
      templateKey: WorkspaceTemplate.INDIVIDUAL,
      deselectedOptionalAppUniversalIdentifiers: [
        A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
      ],
    },
    expectedCodes: [OnboardingExceptionCode.TEMPLATE_REQUIRED_APP_DESELECTED],
  },
  {
    matrixRow: 'Required app unregistered / version incompatible',
    stage: 'step-failure',
    request: { templateKey: WorkspaceTemplate.INDIVIDUAL },
    expectedCodes: ['APP_NOT_REGISTERED', 'VERSION_INCOMPATIBLE'],
  },
  {
    matrixRow: 'Same idempotency key retried with the same configuration',
    stage: 'idempotent-replay',
    request: {
      templateKey: WorkspaceTemplate.INDIVIDUAL,
      idempotencyKey: IDEMPOTENCY_KEY,
    },
    expectedCodes: [],
  },
  {
    matrixRow: 'Same idempotency key reused with a different configuration',
    stage: 'pre-step',
    request: {
      templateKey: WorkspaceTemplate.TEAM,
      idempotencyKey: IDEMPOTENCY_KEY,
    },
    expectedCodes: [OnboardingExceptionCode.TEMPLATE_IDEMPOTENCY_CONFLICT],
  },
  {
    matrixRow: "Template content referencing another workspace's record",
    stage: 'descriptor-load',
    contentDescriptor: {
      descriptorKey: 'cross-workspace-document',
      version: 1,
      referenceKind: 'workspace-record',
      references: [],
    },
    expectedCodes: ['TEMPLATE_CONTENT_CROSS_WORKSPACE'],
  },
  {
    matrixRow:
      'Content-template descriptor whose relations/references form a cycle',
    stage: 'descriptor-load',
    contentDescriptor: {
      descriptorKey: 'cyclic-project-plan',
      version: 1,
      referenceKind: 'universal-identifier',
      references: [
        {
          sourceNodeKey: 'task-a',
          targetNodeKey: 'task-b',
          targetUniversalIdentifier: CYCLE_NODE_A_UNIVERSAL_IDENTIFIER,
        },
        {
          sourceNodeKey: 'task-b',
          targetNodeKey: 'task-a',
          targetUniversalIdentifier: CYCLE_NODE_B_UNIVERSAL_IDENTIFIER,
        },
      ],
    },
    expectedCodes: ['TEMPLATE_CONTENT_CYCLE'],
  },
];
