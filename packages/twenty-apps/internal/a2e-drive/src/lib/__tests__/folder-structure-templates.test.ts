import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  FOLDER_STRUCTURE_CATEGORY,
  FOLDER_STRUCTURE_TEMPLATE_KEYS,
  FOLDER_STRUCTURE_TEMPLATES,
  findMissingFolderStructureTemplates,
  flattenFolderStructureTemplate,
  getFolderStructureTemplate,
} from '../folder-structure-templates.ts';

const EXPECTED_KEYS = ['CLIENT', 'ASSOCIATION', 'ETUDIANT', 'ADMINISTRATION_ENTREPRISE'];

test('the family ships the four M9c Archive folder structures', () => {
  assert.deepEqual(FOLDER_STRUCTURE_TEMPLATE_KEYS, EXPECTED_KEYS);
});

for (const template of FOLDER_STRUCTURE_TEMPLATES) {
  test(`descriptor ${template.key} is complete and builds folders only`, () => {
    assert.equal(template.key, getFolderStructureTemplate(template.key)?.key);
    assert.equal(template.version, 1);
    assert.equal(template.category, FOLDER_STRUCTURE_CATEGORY);
    assert.deepEqual(template.requiredApps, []);
    assert.ok(template.labels.fr.length > 0);
    assert.ok(template.labels.en.length > 0);
    assert.notEqual(template.labels.fr, template.labels.en);
    assert.ok(template.tree.name.length > 0);

    const drafts = flattenFolderStructureTemplate(template);

    assert.ok(drafts.length > 1);
    assert.equal(drafts[0]?.parentName, null);
    assert.equal(drafts[0]?.name, template.tree.name);
    assert.ok(
      drafts.every(
        (draft) =>
          draft.name.length > 0 &&
          draft.templateKey === template.key &&
          !Object.hasOwn(draft, 'markdown') &&
          !Object.hasOwn(draft, 'attachmentId'),
      ),
    );
  });
}

test('a parent draft always precedes its child in the flatten order', () => {
  for (const template of FOLDER_STRUCTURE_TEMPLATES) {
    const drafts = flattenFolderStructureTemplate(template);
    const indexByName = new Map(
      drafts.map((draft, index) => [draft.name, index]),
    );

    for (const draft of drafts) {
      if (draft.parentName === null) {
        continue;
      }

      assert.ok(
        (indexByName.get(draft.parentName) ?? Number.MAX_SAFE_INTEGER) <
          (indexByName.get(draft.name) ?? -1),
      );
    }
  }
});

test('the missing-templates delta keys on the descriptor provenance', () => {
  assert.deepEqual(
    findMissingFolderStructureTemplates([]).map((template) => template.key),
    EXPECTED_KEYS,
  );
  assert.deepEqual(
    findMissingFolderStructureTemplates(['CLIENT', 'ASSOCIATION']).map(
      (template) => template.key,
    ),
    ['ETUDIANT', 'ADMINISTRATION_ENTREPRISE'],
  );
  assert.deepEqual(
    findMissingFolderStructureTemplates([...EXPECTED_KEYS, null, undefined]),
    [],
  );
});

test('getFolderStructureTemplate rejects an unknown key', () => {
  assert.equal(getFolderStructureTemplate('NOT_A_TEMPLATE'), undefined);
});
