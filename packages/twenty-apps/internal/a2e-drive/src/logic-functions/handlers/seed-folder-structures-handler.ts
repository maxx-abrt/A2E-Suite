import {
  createFolderStructureTree,
  type FolderStructureClient,
} from '../../lib/create-folder-structure-tree.ts';
import {
  findMissingFolderStructureTemplates,
} from '../../lib/folder-structure-templates.ts';

// INSTALL = ORGANISED FROM THE FIRST FILE.
//
// Archive opens with the four persona folder structures already built as
// `driveFolder` trees. The seeder only writes folders — never an attachment or
// file record — and is idempotent: every seeded folder carries the descriptor
// key in `templateKey`, so a reinstall deltas to the templates that are absent
// and never duplicates a subtree. The tree write itself lives in
// `lib/create-folder-structure-tree.ts`, shared with the M9a-3 gallery apply;
// this module keeps the install-time missing-key delta. Kept out of the
// logic-function module so the unit runner can exercise the write path without
// importing twenty-sdk/define.

export type SeedingClient = FolderStructureClient;

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

export const seedFolderStructures = async (
  client: SeedingClient,
): Promise<FolderStructureSeedingSummary> => {
  const existingTemplateKeys = await findExistingTemplateKeys(client);
  const missingTemplates = findMissingFolderStructureTemplates(
    existingTemplateKeys,
  );

  let foldersCreated = 0;

  for (const template of missingTemplates) {
    const tree = await createFolderStructureTree(client, template);

    foldersCreated += tree.folderIds.length;
  }

  return { templatesCreated: missingTemplates.length, foldersCreated };
};
