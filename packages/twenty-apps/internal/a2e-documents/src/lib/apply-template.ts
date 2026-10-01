import type { CoreApiClient } from 'twenty-client-sdk/core';
import {
  resolveTemplateApplyRequestError,
  type TemplateApplyCreatedRecord,
  type TemplateApplyInstalledApplications,
  type TemplateApplyResult,
  type TemplateDescriptor,
} from 'twenty-shared/application';

import {
  buildDocumentTemplateDescriptors,
  toDocumentTemplateKey,
} from './document-template-descriptors.ts';
import { buildTemplateCopyPayload } from './instantiate-template.ts';
import {
  STARTER_DOCUMENT_TEMPLATES,
  type StarterDocumentTemplate,
} from './starter-templates.ts';

// M9a-3 (US-131) — the documents half of the gallery's "Use template" write
// path.
//
// It reuses the existing template-copy/instantiation path: a page template is
// the `STARTER_DOCUMENT_TEMPLATES` markdown, and applying it builds a fresh
// DOCUMENT through `buildTemplateCopyPayload` (the same helper the browser's
// instantiate-template action uses — it strips the `Modèle — ` prefix, mints
// fresh block anchors and carries no source relations, so the copy never
// aliases the template — C1).
//
// Payload construction and the write are client-injected so the app unit runner
// can exercise the apply path without a live workspace; the logic-function
// wrapper supplies the real core/metadata clients.

export type ApplyTemplateClient = Pick<CoreApiClient, 'query' | 'mutation'>;

export type ApplyTemplateRequest = {
  key: string;
  inputs?: Record<string, unknown> | null;
  operationId?: string | null;
};

export type ApplyTemplateDependencies = {
  getInstalledApplications: () => Promise<TemplateApplyInstalledApplications>;
};

const DOCUMENT_OBJECT_NAME = 'document';

const normalizeOperationId = (operationId: unknown): string | null => {
  if (typeof operationId !== 'string' || operationId.trim() === '') {
    return null;
  }

  return operationId.trim();
};

const findDescriptor = (key: string): TemplateDescriptor | undefined =>
  buildDocumentTemplateDescriptors().find(
    (descriptor) => descriptor.key === key,
  );

// The descriptor key is the slug of the starter title, so the same projection
// resolves both directions of the contract without a second mapping.
const findStarterTemplate = (
  key: string,
): StarterDocumentTemplate | undefined =>
  STARTER_DOCUMENT_TEMPLATES.find(
    (starterTemplate) => toDocumentTemplateKey(starterTemplate.title) === key,
  );

const findDocumentIdByOperationId = async (
  client: ApplyTemplateClient,
  operationId: string,
): Promise<string | undefined> => {
  const result = (await client.query({
    documents: {
      __args: {
        filter: { templateApplyOperationId: { eq: operationId } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { documents?: { edges?: { node: { id: string } }[] } };

  return result?.documents?.edges?.[0]?.node?.id;
};

const createDocumentFromTemplate = async (
  client: ApplyTemplateClient,
  starterTemplate: StarterDocumentTemplate,
  operationId: string | null,
): Promise<TemplateApplyCreatedRecord> => {
  const payload = buildTemplateCopyPayload({
    title: starterTemplate.title,
    content: { markdown: starterTemplate.markdown },
  });

  const result = (await client.mutation({
    createDocuments: {
      __args: {
        data: [
          {
            title: payload.title,
            kind: payload.kind,
            position: payload.position,
            content: payload.content,
            ...(operationId === null
              ? {}
              : { templateApplyOperationId: operationId }),
          },
        ],
      },
      id: true,
    },
  } as never)) as { createDocuments?: { id: string }[] };

  return {
    object: DOCUMENT_OBJECT_NAME,
    id: result?.createDocuments?.[0]?.id ?? '',
  };
};

// The core write path. Takes an already-resolved descriptor so the validation
// and idempotency behaviour can be exercised against a synthetic descriptor
// with `requiredApps` (no shipped page template requires another app).
export const applyResolvedDocumentTemplate = async (
  client: ApplyTemplateClient,
  descriptor: TemplateDescriptor,
  request: ApplyTemplateRequest,
  installedApplications: TemplateApplyInstalledApplications,
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
    const existingDocumentId = await findDocumentIdByOperationId(
      client,
      operationId,
    );

    if (existingDocumentId !== undefined) {
      return {
        status: 'applied',
        key: descriptor.key,
        version: descriptor.version,
        operationId,
        created: [{ object: DOCUMENT_OBJECT_NAME, id: existingDocumentId }],
      };
    }
  }

  const starterTemplate = findStarterTemplate(descriptor.key);

  if (starterTemplate === undefined) {
    return {
      status: 'rejected',
      key: descriptor.key,
      errorCode: 'APPLY_FAILED',
      message: `Le contenu du modèle « ${descriptor.key} » est introuvable.`,
    };
  }

  const created = await createDocumentFromTemplate(
    client,
    starterTemplate,
    operationId,
  );

  return {
    status: 'applied',
    key: descriptor.key,
    version: descriptor.version,
    operationId,
    created: [created],
  };
};

export const applyDocumentTemplateByKey = async (
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
      message: `Aucun modèle de page ne correspond à la clé « ${request.key} ».`,
    };
  }

  const installedApplications = await dependencies.getInstalledApplications();

  return applyResolvedDocumentTemplate(
    client,
    descriptor,
    request,
    installedApplications,
  );
};
