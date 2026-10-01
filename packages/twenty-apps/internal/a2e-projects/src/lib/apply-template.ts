import type { CoreApiClient } from 'twenty-client-sdk/core';
import {
  resolveTemplateApplyRequestError,
  type TemplateApplyCreatedRecord,
  type TemplateApplyInstalledApplications,
  type TemplateApplyResult,
  type TemplateDescriptor,
} from 'twenty-shared/application';

import { createStarterProject } from './create-starter-project.ts';
import { buildProjectTemplateDescriptors } from './project-template-descriptors.ts';
import {
  STARTER_PROJECT_TEMPLATES,
  type StarterProjectTemplate,
} from './starter-projects.ts';

// M9a-3 (US-131) — the projects half of the gallery's "Use template" write
// path.
//
// It reuses the install seeder's instantiation (`createStarterProject`): a
// project template is a `STARTER_PROJECT_TEMPLATES` entry, and applying it
// creates a fresh project plus its tasks and milestones. Every id is minted by
// the API on each apply and nothing links back to the template (C1 no aliasing).
//
// Client-injected so the unit runner can exercise the apply path without a live
// workspace; the logic-function wrapper supplies the real clients.

export type ApplyTemplateClient = Pick<CoreApiClient, 'query' | 'mutation'>;

export type ApplyTemplateRequest = {
  key: string;
  inputs?: Record<string, unknown> | null;
  operationId?: string | null;
};

export type ApplyTemplateDependencies = {
  getInstalledApplications: () => Promise<TemplateApplyInstalledApplications>;
  now?: Date;
};

const PROJECT_OBJECT_NAME = 'project';
const TASK_OBJECT_NAME = 'task';
const MILESTONE_OBJECT_NAME = 'milestone';

const normalizeOperationId = (operationId: unknown): string | null => {
  if (typeof operationId !== 'string' || operationId.trim() === '') {
    return null;
  }

  return operationId.trim();
};

const findDescriptor = (key: string): TemplateDescriptor | undefined =>
  buildProjectTemplateDescriptors().find(
    (descriptor) => descriptor.key === key,
  );

const findStarterProject = (
  key: string,
): StarterProjectTemplate | undefined =>
  STARTER_PROJECT_TEMPLATES.find(
    (starterProject) => starterProject.key === key,
  );

const findProjectIdByOperationId = async (
  client: ApplyTemplateClient,
  operationId: string,
): Promise<string | undefined> => {
  const result = (await client.query({
    projects: {
      __args: {
        filter: { templateApplyOperationId: { eq: operationId } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { projects?: { edges?: { node: { id: string } }[] } };

  return result?.projects?.edges?.[0]?.node?.id;
};

export const applyResolvedProjectTemplate = async (
  client: ApplyTemplateClient,
  descriptor: TemplateDescriptor,
  request: ApplyTemplateRequest,
  installedApplications: TemplateApplyInstalledApplications,
  now: Date = new Date(),
): Promise<TemplateApplyResult> => {
  const rejection = resolveTemplateApplyRequestError({
    descriptor,
    installedApplications,
    inputs: request.inputs,
  });

  if (rejection !== null) {
    return {
      status: 'rejected',
      key: descriptor.key,
      errorCode: rejection.errorCode,
      message: rejection.message,
    };
  }

  const operationId = normalizeOperationId(request.operationId);

  if (operationId !== null) {
    const existingProjectId = await findProjectIdByOperationId(
      client,
      operationId,
    );

    if (existingProjectId !== undefined) {
      return {
        status: 'applied',
        key: descriptor.key,
        version: descriptor.version,
        operationId,
        created: [{ object: PROJECT_OBJECT_NAME, id: existingProjectId }],
      };
    }
  }

  const starterProject = findStarterProject(descriptor.key);

  if (starterProject === undefined) {
    return {
      status: 'rejected',
      key: descriptor.key,
      errorCode: 'APPLY_FAILED',
      message: `Le contenu du modèle « ${descriptor.key} » est introuvable.`,
    };
  }

  const { projectId, taskIds, milestoneIds } = await createStarterProject(
    client,
    starterProject,
    { now, operationId },
  );

  const created: TemplateApplyCreatedRecord[] = [
    { object: PROJECT_OBJECT_NAME, id: projectId },
    ...taskIds.map((id) => ({ object: TASK_OBJECT_NAME, id })),
    ...milestoneIds.map((id) => ({ object: MILESTONE_OBJECT_NAME, id })),
  ];

  return {
    status: 'applied',
    key: descriptor.key,
    version: descriptor.version,
    operationId,
    created,
  };
};

export const applyProjectTemplateByKey = async (
  client: ApplyTemplateClient,
  request: ApplyTemplateRequest,
  dependencies: ApplyTemplateDependencies,
): Promise<TemplateApplyResult> => {
  const descriptor = findDescriptor(request.key);

  if (descriptor === undefined) {
    return {
      status: 'rejected',
      key: request.key,
      errorCode: 'UNKNOWN_TEMPLATE_KEY',
      message: `Aucun modèle de projet ne correspond à la clé « ${request.key} ».`,
    };
  }

  const installedApplications = await dependencies.getInstalledApplications();

  return applyResolvedProjectTemplate(
    client,
    descriptor,
    request,
    installedApplications,
    dependencies.now,
  );
};
