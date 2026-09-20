import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

import {
  type ApplyTemplateErrorCode,
  type ApplyTemplateResult,
  type ApplyTemplateStep,
  type OperationStepErrorCode,
  type OperationStepKind,
  type OperationStepStatus,
  type TemplateKeyVersion,
  type TemplatePreview,
  type TemplatePreviewApp,
  type TemplatePreviewBlockedSample,
  type TemplatePreviewNavigationChange,
} from 'src/engine/core-modules/onboarding/types/apply-template-operation.types';

export enum OperationStepKindEnum {
  INSTALL_APP = 'install-app',
  NAVIGATION_VISIBILITY = 'navigation-visibility',
  SEED_SAMPLES = 'seed-samples',
  SET_WORKSPACE_TEMPLATE = 'set-workspace-template',
}

registerEnumType(OperationStepKindEnum, {
  name: 'OperationStepKind',
});

export enum OperationStepStatusEnum {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

registerEnumType(OperationStepStatusEnum, {
  name: 'OperationStepStatus',
});

export enum OperationStepErrorCodeEnum {
  APP_NOT_REGISTERED = 'APP_NOT_REGISTERED',
  VERSION_INCOMPATIBLE = 'VERSION_INCOMPATIBLE',
  INSTALL_FAILED = 'INSTALL_FAILED',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  SEED_FAILED = 'SEED_FAILED',
}

registerEnumType(OperationStepErrorCodeEnum, {
  name: 'OperationStepErrorCode',
});

export enum ApplyTemplateErrorCodeEnum {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NO_APPS_AVAILABLE = 'NO_APPS_AVAILABLE',
}

registerEnumType(ApplyTemplateErrorCodeEnum, {
  name: 'ApplyTemplateErrorCode',
});

@ObjectType()
export class TemplateKeyVersionDTO implements TemplateKeyVersion {
  @Field(() => String)
  key: string;

  @Field(() => Int)
  version: number;
}

@ObjectType()
export class ApplyTemplateStepDTO implements ApplyTemplateStep {
  @Field(() => OperationStepKindEnum)
  kind: OperationStepKind;

  @Field(() => String, { nullable: true })
  targetUniversalIdentifier?: string;

  @Field(() => OperationStepStatusEnum)
  status: OperationStepStatus;

  @Field(() => [String], { nullable: true })
  createdRecordUniversalIdentifiers?: string[];

  @Field(() => OperationStepErrorCodeEnum, { nullable: true })
  errorCode?: OperationStepErrorCode;

  @Field(() => String, { nullable: true })
  localizedMessage?: string;
}

@ObjectType()
export class ApplyTemplateResultDTO implements ApplyTemplateResult {
  @Field(() => String)
  operationId: string;

  @Field(() => TemplateKeyVersionDTO, { nullable: true })
  requestedTemplateKeyVersion: TemplateKeyVersion | null;

  @Field(() => TemplateKeyVersionDTO, { nullable: true })
  appliedTemplateKeyVersion: TemplateKeyVersion | null;

  @Field(() => [ApplyTemplateStepDTO])
  steps: ApplyTemplateStep[];
}

@ObjectType()
export class TemplatePreviewAppDTO {
  @Field(() => String)
  universalIdentifier: string;

  @Field(() => String)
  displayName: string;

  @Field(() => Boolean)
  registered: boolean;

  @Field(() => Boolean)
  versionCompatible: boolean;

  @Field(() => Boolean)
  required: boolean;

  @Field(() => Boolean)
  currentlyInstalled: boolean;
}

@ObjectType()
export class TemplatePreviewNavigationChangeDTO {
  @Field(() => String)
  universalIdentifier: string;

  @Field(() => String)
  action: 'hide' | 'restore';
}

@ObjectType()
export class TemplatePreviewSampleDTO {
  @Field(() => String)
  label: string;

  @Field(() => String)
  locale: string;
}

@ObjectType()
export class TemplatePreviewBlockedSampleDTO {
  @Field(() => String)
  label: string;

  @Field(() => String)
  locale: string;

  // Upstream gate key (e.g. P7.0_SAFETY_GATE) the client localizes.
  @Field(() => String)
  blockedBy: string;
}

@ObjectType()
export class TemplatePreviewDTO implements TemplatePreview {
  @Field(() => String)
  templateKey: string;

  @Field(() => Int)
  version: number;

  @Field(() => [TemplatePreviewAppDTO])
  apps: TemplatePreviewApp[];

  @Field(() => [TemplatePreviewNavigationChangeDTO])
  navigationChanges: TemplatePreviewNavigationChange[];

  @Field(() => [TemplatePreviewSampleDTO])
  samples: TemplatePreview['samples'];

  // Proposed content deferred behind an upstream gate; surfaced so an exclusion
  // is never silent.
  @Field(() => [TemplatePreviewBlockedSampleDTO])
  blockedSamples: TemplatePreviewBlockedSample[];

  // True when a required app is unregistered or incompatible: preview stays
  // visible but apply is refused.
  @Field(() => Boolean)
  blocked: boolean;

  // Distinct failure discriminator (C2); null when the preview is complete.
  @Field(() => ApplyTemplateErrorCodeEnum, { nullable: true })
  errorCode?: ApplyTemplateErrorCode | null;
}

export type {
  ApplyTemplateErrorCode,
  ApplyTemplateResult,
  ApplyTemplateStep,
  OperationStepErrorCode,
  OperationStepKind,
  OperationStepStatus,
  TemplatePreview,
  TemplatePreviewApp,
  TemplatePreviewBlockedSample,
  TemplatePreviewNavigationChange,
} from 'src/engine/core-modules/onboarding/types/apply-template-operation.types';
