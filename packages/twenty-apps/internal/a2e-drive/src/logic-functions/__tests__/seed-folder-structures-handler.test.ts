import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  FOLDER_STRUCTURE_TEMPLATES,
  flattenFolderStructureTemplate,
} from '../../lib/folder-structure-templates.ts';
import {
  seedFolderStructures,
  type SeedingClient,
} from '../handlers/seed-folder-structures-handler.ts';

type CreatedFolder = {
  id: string;
  data: {
    name: string;
    icon: string | null;
    templateKey: string;
    parentId?: string;
  };
};

const buildClient = (
  existingTemplateKeys: string[],
): { client: SeedingClient; created: CreatedFolder[]; mutationNames: string[] } => {
  const created: CreatedFolder[] = [];
  const mutationNames: string[] = [];

  const client: SeedingClient = {
    query: (async (document: Record<string, unknown>) => {
      const queryKey = Object.keys(document)[0];

      return {
        [queryKey]: {
          edges: existingTemplateKeys.map((templateKey) => ({
            node: { templateKey },
          })),
        },
      };
    }) as SeedingClient['query'],
    mutation: (async (document: Record<string, Record<string, unknown>>) => {
      const mutationName = Object.keys(document)[0] ?? '';
      mutationNames.push(mutationName);

      const args = document[mutationName]?.__args as
        | { data: CreatedFolder['data'][] }
        | undefined;
      const data = args?.data?.[0];

      if (data === undefined) {
        return {};
      }

      const id = `folder-${created.length + 1}`;
      created.push({ id, data });

      return { [mutationName]: [{ id }] };
    }) as SeedingClient['mutation'],
  };

  return { client, created, mutationNames };
};

const totalFolders = (): number =>
  FOLDER_STRUCTURE_TEMPLATES.reduce(
    (total, template) => total + flattenFolderStructureTemplate(template).length,
    0,
  );

test('a fresh workspace seeds every template as a driveFolder tree', async () => {
  const { client, created, mutationNames } = buildClient([]);

  const summary = await seedFolderStructures(client);

  assert.deepEqual(summary, {
    templatesCreated: FOLDER_STRUCTURE_TEMPLATES.length,
    foldersCreated: totalFolders(),
  });
  assert.ok(created.length > 0);
  assert.deepEqual([...new Set(mutationNames)], ['createDriveFolders']);
  assert.ok(
    created.every(
      (entry) =>
        entry.data.templateKey.length > 0 &&
        !Object.hasOwn(entry.data, 'id') &&
        !Object.hasOwn(entry.data, 'attachmentId'),
    ),
  );
});

test('a seeded child is parented to the row its template just created', async () => {
  const { client, created } = buildClient([]);

  await seedFolderStructures(client);

  const [firstTemplate] = FOLDER_STRUCTURE_TEMPLATES;
  const drafts = flattenFolderStructureTemplate(firstTemplate!);

  assert.equal(created[0]?.data.parentId, undefined);

  for (const [index, draft] of drafts.entries()) {
    if (draft.parentName === null) {
      continue;
    }

    const parentDraftIndex = drafts.findIndex(
      (candidate) => candidate.name === draft.parentName,
    );

    assert.equal(created[index]?.data.parentId, created[parentDraftIndex]?.id);
  }
});

test('re-applying an already-seeded workspace creates nothing', async () => {
  const allKeys = FOLDER_STRUCTURE_TEMPLATES.map((template) => template.key);
  const { client, created, mutationNames } = buildClient(allKeys);

  const summary = await seedFolderStructures(client);

  assert.deepEqual(summary, { templatesCreated: 0, foldersCreated: 0 });
  assert.equal(created.length, 0);
  assert.equal(mutationNames.length, 0);
});

test('a partial workspace only seeds the templates that are missing', async () => {
  const { client, created } = buildClient(['CLIENT']);

  const summary = await seedFolderStructures(client);

  const expectedTemplates = FOLDER_STRUCTURE_TEMPLATES.filter(
    (template) => template.key !== 'CLIENT',
  );

  assert.equal(summary.templatesCreated, expectedTemplates.length);
  assert.equal(
    summary.foldersCreated,
    expectedTemplates.reduce(
      (total, template) =>
        total + flattenFolderStructureTemplate(template).length,
      0,
    ),
  );
  assert.ok(
    created.every((entry) => entry.data.templateKey !== 'CLIENT'),
  );
});
