import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractTaskProposals } from '../document-task-extraction.ts';

// Deterministic, read-only parsing of the serialized blocknote body. The
// contract: explicit to-do/checkbox blocks are the primary source, and the
// conservative heading/imperative heuristic is the only secondary one — plain
// prose is never harvested.

const blocknote = (blocks: unknown[]): string => JSON.stringify(blocks);

const textContent = (text: string) => [{ type: 'text', text, styles: {} }];

test('unchecked to-do blocks become proposals', () => {
  const proposals = extractTaskProposals(
    blocknote([
      {
        id: 'b1',
        type: 'checkListItem',
        props: { checked: false },
        content: textContent('Préparer la présentation client'),
      },
      {
        id: 'b2',
        type: 'checkListItem',
        props: { checked: false },
        content: textContent('Relancer le fournisseur'),
      },
    ]),
  );

  assert.deepEqual(proposals, [
    { title: 'Préparer la présentation client' },
    { title: 'Relancer le fournisseur' },
  ]);
});

test('a checked to-do is already done and is not proposed again', () => {
  const proposals = extractTaskProposals(
    blocknote([
      {
        id: 'b1',
        type: 'checkListItem',
        props: { checked: true },
        content: textContent('Tâche terminée'),
      },
    ]),
  );

  assert.deepEqual(proposals, []);
});

test('nested to-do blocks are walked depth-first', () => {
  const proposals = extractTaskProposals(
    blocknote([
      {
        id: 'parent',
        type: 'checkListItem',
        props: { checked: false },
        content: textContent('Préparer la migration'),
        children: [
          {
            id: 'child',
            type: 'checkListItem',
            props: { checked: false },
            content: textContent('Sauvegarder la base'),
          },
        ],
      },
    ]),
  );

  assert.deepEqual(proposals, [
    { title: 'Préparer la migration' },
    { title: 'Sauvegarder la base' },
  ]);
});

test('the nearest preceding heading is the proposal description', () => {
  const proposals = extractTaskProposals(
    blocknote([
      {
        id: 'h1',
        type: 'heading',
        content: textContent('Lancement'),
      },
      {
        id: 'todo',
        type: 'checkListItem',
        props: { checked: false },
        content: textContent('Envoyer les invitations'),
      },
    ]),
  );

  assert.deepEqual(proposals, [
    { title: 'Envoyer les invitations', description: 'Lancement' },
  ]);
});

test('an imperative paragraph becomes a proposal', () => {
  const proposals = extractTaskProposals(
    blocknote([
      {
        id: 'p1',
        type: 'paragraph',
        content: textContent('Vérifier les factures de septembre'),
      },
    ]),
  );

  assert.deepEqual(proposals, [
    { title: 'Vérifier les factures de septembre' },
  ]);
});

test('an imperative heading is proposed and still scopes its children', () => {
  const proposals = extractTaskProposals(
    blocknote([
      {
        id: 'h1',
        type: 'heading',
        content: textContent('Corriger la connexion'),
        children: [
          {
            id: 'todo',
            type: 'checkListItem',
            props: { checked: false },
            content: textContent('Ajouter un test de régression'),
          },
        ],
      },
    ]),
  );

  assert.deepEqual(proposals, [
    { title: 'Corriger la connexion' },
    {
      title: 'Ajouter un test de régression',
      description: 'Corriger la connexion',
    },
  ]);
});

test('plain prose and questions are never proposed', () => {
  const proposals = extractTaskProposals(
    blocknote([
      {
        id: 'p1',
        type: 'paragraph',
        content: textContent(
          'Cette section décrit le contexte du projet et ses contraintes.',
        ),
      },
      {
        id: 'p2',
        type: 'paragraph',
        content: textContent('Faut-il relancer le fournisseur ?'),
      },
      {
        id: 'p3',
        type: 'paragraph',
        content: textContent(
          'Créer un compte. Une fois validé, il ouvre le tableau de bord.',
        ),
      },
    ]),
  );

  assert.deepEqual(proposals, []);
});

test('repeated titles are de-duplicated', () => {
  const proposals = extractTaskProposals(
    blocknote([
      {
        id: 't1',
        type: 'checkListItem',
        props: { checked: false },
        content: textContent('Relire le contrat'),
      },
      {
        id: 't2',
        type: 'checkListItem',
        props: { checked: false },
        content: textContent('Relire le contrat'),
      },
    ]),
  );

  assert.deepEqual(proposals, [{ title: 'Relire le contrat' }]);
});

test('an absent, empty or malformed body yields no proposal', () => {
  assert.deepEqual(extractTaskProposals(null), []);
  assert.deepEqual(extractTaskProposals(undefined), []);
  assert.deepEqual(extractTaskProposals(''), []);
  assert.deepEqual(extractTaskProposals('[]'), []);
  assert.deepEqual(extractTaskProposals('not json'), []);
  assert.deepEqual(extractTaskProposals('{"blocks":[]}'), []);
});
