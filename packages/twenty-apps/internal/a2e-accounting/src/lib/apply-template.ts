import type { CoreApiClient } from 'twenty-client-sdk/core';
import {
  resolveTemplateApplyRequestError,
  type TemplateApplyCreatedRecord,
  type TemplateApplyInstalledApplications,
  type TemplateApplyResult,
  type TemplateDescriptor,
} from 'twenty-shared/application';

import { buildFicheTemplateDescriptors } from './fiche-template-descriptors.ts';
import { getFicheTemplate, withTemplateDefaults } from './fiche-templates.ts';

// M9a-3 (US-131) — the Bilan half of the gallery's "Use template" write path.
//
// It reuses the fiche-template instantiation the editor and the install seeder
// use: a fiche template is a `FICHE_TEMPLATES` entry, and applying it creates a
// fresh fiche whose payload is backfilled through `withTemplateDefaults` (all
// amounts stay zero — C6; a template is data, never a real movement). The new
// fiche carries no relation to the template, so editing it never mutates the
// template (C1).
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

const FICHE_OBJECT_NAME = 'fiche';

const normalizeOperationId = (operationId: unknown): string | null => {
  if (typeof operationId !== 'string' || operationId.trim() === '') {
    return null;
  }

  return operationId.trim();
};

const findDescriptor = (key: string): TemplateDescriptor | undefined =>
  buildFicheTemplateDescriptors().find((descriptor) => descriptor.key === key);

// The gallery may pass a partial `data` payload through `inputs.data`; it is
// merged over the template defaults so a fiche always renders, whatever subset
// the caller filled in.
const readTemplateDataInput = (
  inputs: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined => {
  const data = inputs?.data;

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return undefined;
  }

  return data as Record<string, unknown>;
};

const findFicheIdByOperationId = async (
  client: ApplyTemplateClient,
  operationId: string,
): Promise<string | undefined> => {
  const result = (await client.query({
    fiches: {
      __args: {
        filter: { templateApplyOperationId: { eq: operationId } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { fiches?: { edges?: { node: { id: string } }[] } };

  return result?.fiches?.edges?.[0]?.node?.id;
};

export const applyResolvedFicheTemplate = async (
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
    const existingFicheId = await findFicheIdByOperationId(client, operationId);

    if (existingFicheId !== undefined) {
      return {
        status: 'applied',
        key: descriptor.key,
        version: descriptor.version,
        operationId,
        created: [{ object: FICHE_OBJECT_NAME, id: existingFicheId }],
      };
    }
  }

  const template = getFicheTemplate(descriptor.key);

  if (template === undefined) {
    return {
      status: 'rejected',
      key: descriptor.key,
      errorCode: 'APPLY_FAILED',
      message: `Le contenu du modèle « ${descriptor.key} » est introuvable.`,
    };
  }

  const inputData = readTemplateDataInput(request.inputs);

  const result = (await client.mutation({
    createFiches: {
      __args: {
        data: [
          {
            title: template.defaultTitle,
            templateKey: descriptor.key,
            fiscalYear: String(now.getUTCFullYear()),
            data: withTemplateDefaults(descriptor.key, inputData),
            ...(operationId === null
              ? {}
              : { templateApplyOperationId: operationId }),
          },
        ],
      },
      id: true,
    },
  } as never)) as { createFiches?: { id: string }[] };

  const created: TemplateApplyCreatedRecord[] = [
    {
      object: FICHE_OBJECT_NAME,
      id: result?.createFiches?.[0]?.id ?? '',
    },
  ];

  return {
    status: 'applied',
    key: descriptor.key,
    version: descriptor.version,
    operationId,
    created,
  };
};

export const applyFicheTemplateByKey = async (
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
      message: `Aucun modèle de fiche ne correspond à la clé « ${request.key} ».`,
    };
  }

  // Own-app templates do not require access to workspace application settings.
  const installedApplications = descriptor.requiredApps.length === 0
    ? { names: [], universalIdentifiers: [] }
    : await dependencies.getInstalledApplications();

  return applyResolvedFicheTemplate(
    client,
    descriptor,
    request,
    installedApplications,
    dependencies.now,
  );
};