import type { CoreApiClient } from 'twenty-client-sdk/core';

import {
  flattenFolderStructureTemplate,
  type FolderStructureFolderDraft,
  type FolderStructureTemplate,
} from './folder-structure-templates.ts';

// Folder-tree instantiation, shared by the install seeder and the M9a-3 gallery
// apply (US-131). It writes `driveFolder` rows only — never an attachment or
// file record. Depth-first pre-order means a parent is always created before
// its children, so each child resolves its parent id from the row just written.
//
// Client-injected so the app unit runner can exercise the write path without a
// live workspace. The root folder carries the apply operation id when one is
// given, so a retried apply finds its tree instead of duplicating it; every
// folder carries its descriptor key regardless.

export type FolderStructureClient = Pick<CoreApiClient, 'query' | 'mutation'>;

export type CreatedFolderStructureTree = {
  // Root first, then the rest in pre-order.
  folderIds: string[];
};

const createFolder = async (
  client: FolderStructureClient,
  draft: FolderStructureFolderDraft,
  parentId: string | null,
  applyOperationId: string | null,
): Promise<string | null> => {
  const result = (await client.mutation({
    createDriveFolders: {
      __args: {
        data: [
          {
            name: draft.name,
            icon: draft.icon,
            templateKey: draft.templateKey,
            // Root folders carry no parent; a null parentId on create is not
            // the same as an omitted field, so it is only added when set.
            ...(parentId === null ? {} : { parentId }),
            ...(applyOperationId === null
              ? {}
              : { templateApplyOperationId: applyOperationId }),
          },
        ],
      },
      id: true,
    },
  } as never)) as { createDriveFolders?: { id: string }[] };

  return result?.createDriveFolders?.[0]?.id ?? null;
};

export const createFolderStructureTree = async (
  client: FolderStructureClient,
  template: FolderStructureTemplate,
  options: { operationId?: string | null } = {},
): Promise<CreatedFolderStructureTree> => {
  const drafts = flattenFolderStructureTemplate(template);
  const operationId = options.operationId ?? null;
  // Names are unique within one tree, so the created parent's name resolves
  // its children. A child whose parent write failed is skipped rather than
  // re-parented to the root.
  const idByFolderName = new Map<string, string>();
  const folderIds: string[] = [];

  for (const draft of drafts) {
    const parentId =
      draft.parentName === null
        ? null
        : (idByFolderName.get(draft.parentName) ?? undefined);

    if (parentId === undefined) {
      continue;
    }

    const isRoot = draft.parentName === null;

    const createdId = await createFolder(
      client,
      draft,
      parentId,
      isRoot ? operationId : null,
    );

    if (createdId === null) {
      continue;
    }

    idByFolderName.set(draft.name, createdId);
    folderIds.push(createdId);
  }

  return { folderIds };
};