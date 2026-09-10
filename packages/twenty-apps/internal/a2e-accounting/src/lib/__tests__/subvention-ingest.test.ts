import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CURATED_AIDS } from '../curated-aids.ts';
import {
  decideIngest,
  findAidsToRetire,
  INGESTABLE_SOURCES,
  resolveEnabledSources,
  type StoredSubvention,
  toSubventionRecord,
} from '../subvention-ingest.ts';
import { finaliseAid } from '../subvention-sources.ts';

const aid = finaliseAid(CURATED_AIDS[0]);

test('aucune configuration signifie les trois sources', () => {
  assert.deepEqual(resolveEnabledSources(undefined, undefined), [
    ...INGESTABLE_SOURCES,
  ]);
  assert.deepEqual(resolveEnabledSources([], '  '), [...INGESTABLE_SOURCES]);
});

test('la configuration accepte les tirets et la casse libre', () => {
  assert.deepEqual(
    resolveEnabledSources(undefined, 'aides-territoires, curated'),
    ['AIDES_TERRITOIRES', 'CURATED'],
  );
  assert.deepEqual(resolveEnabledSources(['carenews'], 'curated'), [
    'CARENEWS',
  ]);
  assert.deepEqual(resolveEnabledSources(undefined, 'inconnue'), []);
});

test('une aide inconnue est créée', () => {
  assert.deepEqual(decideIngest(aid, undefined), { action: 'CREATE' });
});

test('une aide identique et active ne coûte aucune écriture', () => {
  const stored: StoredSubvention = {
    id: 'row-1',
    sourceKey: aid.sourceKey,
    contentHash: aid.contentHash,
    isLive: true,
  };

  assert.deepEqual(decideIngest(aid, stored), {
    action: 'UNCHANGED',
    id: 'row-1',
  });
});

test('une aide modifiée ou réactivée est réécrite', () => {
  assert.deepEqual(
    decideIngest(aid, {
      id: 'row-1',
      sourceKey: aid.sourceKey,
      contentHash: 'ancienne-empreinte',
      isLive: true,
    }),
    { action: 'UPDATE', id: 'row-1' },
  );

  assert.deepEqual(
    decideIngest(aid, {
      id: 'row-1',
      sourceKey: aid.sourceKey,
      contentHash: aid.contentHash,
      isLive: false,
    }),
    { action: 'UPDATE', id: 'row-1' },
  );
});

test('la ligne de catalogue porte la clé de source et les liens', () => {
  const record = toSubventionRecord(aid, 42, '2026-06-01T00:00:00.000Z');

  assert.equal(record.sourceKey, aid.sourceKey);
  assert.equal(record.catalogVersion, 42);
  assert.equal(record.lastSeenAt, '2026-06-01T00:00:00.000Z');
  assert.equal(record.searchText, aid.searchText);
  assert.deepEqual(record.links, {
    primaryLinkUrl: aid.url,
    primaryLinkLabel: 'Fiche officielle',
    secondaryLinks: [
      { url: aid.applicationUrl, label: 'Déposer un dossier' },
    ],
  });
});

test('seules les aides de la source lue et absentes sont retirées', () => {
  const stored: StoredSubvention[] = [
    { id: 'a', sourceKey: 'CURATED:fdva-2', isLive: true },
    { id: 'b', sourceKey: 'CURATED:disparue', isLive: true },
    { id: 'c', sourceKey: 'CURATED:deja-retiree', isLive: false },
    { id: 'd', sourceKey: 'CARENEWS:autre-source', isLive: true },
  ];

  const toRetire = findAidsToRetire(
    'CURATED',
    new Set(['CURATED:fdva-2']),
    stored,
  );

  assert.deepEqual(
    toRetire.map((record) => record.id),
    ['b'],
  );
});
