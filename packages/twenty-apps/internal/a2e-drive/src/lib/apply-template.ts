import {
  resolveTemplateApplyRequestError,
  type TemplateApplyCreatedRecord,
  type TemplateApplyInstalledApplications,
  type TemplateApplyResult,
  type TemplateDescriptor,
} from 'twenty-shared/application';

import {
  createFolderStructureTree,
  type FolderStructureClient,
} from './create-folder-structure-tree.ts';
import { buildFolderStructureDescriptors } from './folder-structure-descriptors.ts';
import { getFolderStructureTemplate } from './folder-structure-templates.ts';

// M9a-3 (US-131) — the Archive half of the gallery's "Use template" write path.
//
// It reuses the install seeder's tree write (`createFolderStructureTree`): a
// folder template is a `FOLDER_STRUCTURE_TEMPLATES` entry, and applying it
// creates a fresh `driveFolder` tree. Every id is minted by the API on each
// apply; the tree is folders only — never an attachment or file record — and
// nothing links back to the template (C1 no aliasing).
//
// Client-injected so the unit runner can exercise the apply path without a live
// workspace; the logic-function wrapper supplies the real clients.

export type ApplyTemplateClient = FolderStructureClient;

export type ApplyTemplateRequest = {
  key: string;
  inputs?: Record<string, unknown> | null;
  operationId?: string | null;
};

export type ApplyTemplateDependencies = {
  getInstalledApplications: () => Promise<TemplateApplyInstalledApplications>;
};

const DRIVE_FOLDER_OBJECT_NAME = 'driveFolder';

const normalizeOperationId = (operationId: unknown): string | null => {
  if (typeof operationId !== 'string' || operationId.trim() === '') {
    return null;
  }

  return operationId.trim();
};

const findDescriptor = (key: string): TemplateDescriptor | undefined =>
  buildFolderStructureDescriptors().find(
    (descriptor) => descriptor.key === key,
  );

const findRootFolderIdByOperationId = async (
  client: ApplyTemplateClient,
  operationId: string,
): Promise<string | undefined> => {
  const result = (await client.query({
    driveFolders: {
      __args: {
        filter: { templateApplyOperationId: { eq: operationId } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { driveFolders?: { edges?: { node: { id: string } }[] } };

  return result?.driveFolders?.edges?.[0]?.node?.id;
};

export const applyResolvedFolderStructureTemplate = async (
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
    const existingRootFolderId = await findRootFolderIdByOperationId(
      client,
      operationId,
    );

    if (existingRootFolderId !== undefined) {
      return {
        status: 'applied',
        key: descriptor.key,
        version: descriptor.version,
        operationId,
        created: [
          { object: DRIVE_FOLDER_OBJECT_NAME, id: existingRootFolderId },
        ],
      };
    }
  }

  const template = getFolderStructureTemplate(descriptor.key);

  if (template === undefined) {
    return {
      status: 'rejected',
      key: descriptor.key,
      errorCode: 'APPLY_FAILED',
      message: `Le contenu du modèle « ${descriptor.key} » est introuvable.`,
    };
  }

  const tree = await createFolderStructureTree(client, template, {
    operationId,
  });

  const created: TemplateApplyCreatedRecord[] = tree.folderIds.map((id) => ({
    object: DRIVE_FOLDER_OBJECT_NAME,
    id,
  }));

  return {
    status: 'applied',
    key: descriptor.key,
    version: descriptor.version,
    operationId,
    created,
  };
};

export const applyFolderStructureTemplateByKey = async (
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
      message: `Aucune structure de dossiers ne correspond à la clé « ${request.key} ».`,
    };
  }

  const installedApplications = await dependencies.getInstalledApplications();

  return applyResolvedFolderStructureTemplate(
    client,
    descriptor,
    request,
    installedApplications,
  );
};