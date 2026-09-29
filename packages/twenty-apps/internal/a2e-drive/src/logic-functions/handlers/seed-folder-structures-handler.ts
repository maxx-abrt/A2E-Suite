import type { CoreApiClient } from 'twenty-client-sdk/core';

import {
  findMissingFolderStructureTemplates,
  flattenFolderStructureTemplate,
  type FolderStructureFolderDraft,
  type FolderStructureTemplate,
} from '../../lib/folder-structure-templates.ts';

// INSTALL = ORGANISED FROM THE FIRST FILE.
//
// Archive opens with the four persona folder structures already built as
// `driveFolder` trees. The seeder only writes folders — never an attachment or
// file record — and is idempotent: every seeded folder carries the descriptor
// key in `templateKey`, so a reinstall deltas to the templates that are absent
// and never duplicates a subtree. Kept out of the logic-function module so the
// unit runner can exercise the write path without importing twenty-sdk/define.

export type SeedingClient = Pick<CoreApiClient, 'query' | 'mutation'>;

export type FolderStructureSeedingSummary = {
  templatesCreated: number;
  foldersCreated: number;
};

const findExistingTemplateKeys = async (
  client: SeedingClient,
): Promise<string[]> => {
  // Filter to seeded folders only, so the page size has to cover the four
  // template keys — never the user's own folder count (a workspace with
  // thousands of folders must not push a seeded key off the page and re-seed).
  const result = (await client.query({
    driveFolders: {
      __args: { filter: { templateKey: { is: 'NOT_NULL' } }, first: 200 },
      edges: { node: { templateKey: true } },
    },
  } as never)) as {
    driveFolders?: { edges: { node: { templateKey?: string | null } }[] };
  };

  return (result?.driveFolders?.edges ?? [])
    .map((edge) => edge.node.templateKey)
    .filter((key): key is string => typeof key === 'string');
};

const createFolder = async (
  client: SeedingClient,
  draft: FolderStructureFolderDraft,
  parentId: string | null,
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
          },
        ],
      },
      id: true,
    },
  } as never)) as { createDriveFolders?: { id: string }[] };

  return result?.createDriveFolders?.[0]?.id ?? null;
};

const createTemplateTree = async (
  client: SeedingClient,
  template: FolderStructureTemplate,
): Promise<number> => {
  const drafts = flattenFolderStructureTemplate(template);
  // Names are unique within one tree, so the created parent's name resolves
  // its children. A child whose parent write failed is skipped rather than
  // re-parented to the root.
  const idByFolderName = new Map<string, string>();
  let foldersCreated = 0;

  for (const draft of drafts) {
    const parentId =
      draft.parentName === null
        ? null
        : (idByFolderName.get(draft.parentName) ?? undefined);

    if (parentId === undefined) {
      continue;
    }

    const createdId = await createFolder(client, draft, parentId);

    if (createdId === null) {
      continue;
    }

    idByFolderName.set(draft.name, createdId);
    foldersCreated += 1;
  }

  return foldersCreated;
};

export const seedFolderStructures = async (
  client: SeedingClient,
): Promise<FolderStructureSeedingSummary> => {
  const existingTemplateKeys = await findExistingTemplateKeys(client);
  const missingTemplates = findMissingFolderStructureTemplates(
    existingTemplateKeys,
  );

  let foldersCreated = 0;

  for (const template of missingTemplates) {
    foldersCreated += await createTemplateTree(client, template);
  }

  return { templatesCreated: missingTemplates.length, foldersCreated };
};
