import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CURATED_AIDS } from '../curated-aids.ts';
import {
  buildAiCacheKey,
  filterSubventions,
  scoreSubvention,
} from '../subvention-matching.ts';
import {
  buildSearchText,
  buildSourceKey,
  contentHash,
  isStillOpen,
  normaliseAidesTerritoiresAid,
  normaliseAudiences,
  normaliseCarenewsCall,
  normalisePerimeterScale,
  parseFrenchShortDate,
} from '../subvention-sources.ts';

// A verbatim page-1 record of https://aides-territoires.beta.gouv.fr/api/aids/
const AIDES_TERRITOIRES_AID = {
  id: 89_883,
  slug: '45bc-accelerer-des-travaux',
  url: '/aides/45bc-accelerer-des-travaux/',
  name: 'Accélérer des travaux de renforcement de la sécurité de barrages domaniaux',
  short_title: null,
  financers: ["Ministères de l'Aménagement du territoire"],
  instructors: [],
  programs: ['France Relance'],
  description: '<p>Travaux de <b>renforcement</b></p>',
  eligibility: 'Tout gestionnaire d&#039;un barrage domanial',
  perimeter: 'France',
  perimeter_scale: 'Pays',
  region: null,
  categories: [
    "Eau et milieux aquatiques / Cours d'eau / canaux / plans d'eau",
    'Urbanisme / logement / aménagement / Réhabilitation',
  ],
  is_call_for_project: null,
  application_url: null,
  origin_url: 'https://example.gouv.fr/dossier',
  targeted_audiences: ["Etablissement public dont services de l'Etat"],
  aid_types: ['Subvention'],
  start_date: null,
  submission_deadline: '2026-12-31',
  subvention_rate_lower_bound: null,
  subvention_rate_upper_bound: 40,
  subvention_comment: 'Jusqu’à 40 %',
  loan_amount: null,
  recoverable_advance_amount: null,
  contact: null,
  recurrence: 'Ponctuelle',
  european_aid: false,
  is_live: true,
  date_created: '2025-03-12T10:00:00Z',
};

test('an Aides-territoires aid normalises into the Bilan vocabulary', () => {
  const aid = normaliseAidesTerritoiresAid(AIDES_TERRITOIRES_AID);

  assert.ok(aid);
  assert.equal(aid.source, 'AIDES_TERRITOIRES');
  assert.equal(aid.sourceId, '89883');
  assert.equal(aid.sourceKey, 'AIDES_TERRITOIRES:89883');
  assert.equal(aid.description, 'Travaux de renforcement');
  assert.equal(aid.eligibility, "Tout gestionnaire d'un barrage domanial");
  assert.deepEqual(aid.audiences, ['ETABLISSEMENT_PUBLIC']);
  assert.equal(aid.perimeterScale, 'NATIONAL');
  assert.deepEqual(aid.categories, ["plans d'eau", 'Réhabilitation']);
  assert.equal(aid.isCallForProject, false);
  assert.equal(aid.rateMax, 40);
  assert.equal(aid.applicationUrl, 'https://example.gouv.fr/dossier');
  assert.equal(
    aid.url,
    'https://aides-territoires.beta.gouv.fr/aides/45bc-accelerer-des-travaux/',
  );
  assert.equal(aid.submissionDeadline, '2026-12-31T00:00:00.000Z');
});

test('an aid without a usable title is dropped instead of stored empty', () => {
  assert.equal(
    normaliseAidesTerritoiresAid({ ...AIDES_TERRITOIRES_AID, name: ' ' }),
    undefined,
  );
});

test('the audience vocabulary stays short and drops unknown labels', () => {
  assert.deepEqual(normaliseAudiences(['Association', 'PME']), [
    'ASSOCIATION',
    'ENTREPRISE',
  ]);
  assert.deepEqual(normaliseAudiences(['Licorne rose']), []);
  assert.deepEqual(normaliseAudiences(undefined), []);
});

test('perimeter scales map onto the fixed filter list', () => {
  assert.equal(normalisePerimeterScale('Europe'), 'EUROPEEN');
  assert.equal(normalisePerimeterScale('Pays'), 'NATIONAL');
  assert.equal(normalisePerimeterScale('Région'), 'REGION');
  assert.equal(normalisePerimeterScale('Département'), 'DEPARTEMENT');
  assert.equal(normalisePerimeterScale('Commune'), 'COMMUNE');
  assert.equal(normalisePerimeterScale('Bassin versant'), 'AUTRE');
  assert.equal(normalisePerimeterScale(null), undefined);
});

test('a Carenews call for project normalises with its French dates', () => {
  const aid = normaliseCarenewsCall({
    path: '/appels-a-projet/prix-gabriel-2026',
    title: "Prix Gabriel 2026 - jusqu'à 14k € de dotation -",
    description: 'Live for Good récompense des jeunes entrepreneur·es',
    publisher: 'Live for Good',
    publishedAtLabel: 'Publié le : 29.07.2026',
    deadlineLabel: 'Date de clôture : 21.09.2026',
  });

  assert.ok(aid);
  assert.equal(aid.source, 'CARENEWS');
  assert.equal(aid.sourceId, 'prix-gabriel-2026');
  assert.equal(aid.title, "Prix Gabriel 2026 - jusqu'à 14k € de dotation");
  assert.equal(aid.isCallForProject, true);
  assert.deepEqual(aid.financers, ['Live for Good']);
  assert.equal(aid.submissionDeadline, '2026-09-21T00:00:00.000Z');
  assert.equal(aid.publishedAt, '2026-07-29T00:00:00.000Z');
  assert.equal(
    aid.url,
    'https://www.carenews.com/appels-a-projet/prix-gabriel-2026',
  );
});

test('a Carenews row without a slug is dropped', () => {
  assert.equal(
    normaliseCarenewsCall({ path: '/', title: 'Sans identifiant' }),
    undefined,
  );
});

test('French short dates parse, anything else yields undefined', () => {
  assert.equal(parseFrenchShortDate('07.09.2026'), '2026-09-07T00:00:00.000Z');
  assert.equal(parseFrenchShortDate('bientôt'), undefined);
  assert.equal(parseFrenchShortDate(undefined), undefined);
});

test('the search text is accent-insensitive and lowercase', () => {
  const searchText = buildSearchText({
    title: 'Rénovation Énergétique',
    description: undefined,
    eligibility: undefined,
    financers: ['ADEME'],
    categories: ['Énergie'],
    programs: [],
  });

  assert.ok(searchText.includes('renovation energetique'));
  assert.ok(searchText.includes('ademe'));
});

test('the content hash only changes when the content changes', () => {
  assert.equal(contentHash('abc'), contentHash('abc'));
  assert.notEqual(contentHash('abc'), contentHash('abd'));
  assert.equal(contentHash('abc').length, 16);
});

test('source keys never collide across sources', () => {
  assert.notEqual(
    buildSourceKey('CARENEWS', '1'),
    buildSourceKey('CURATED', '1'),
  );
});

test('an aid stays open on its deadline day and closes after', () => {
  const reference = new Date('2026-09-21T18:00:00Z');

  assert.equal(
    isStillOpen({ submissionDeadline: '2026-09-21T00:00:00Z' }, reference),
    true,
  );
  assert.equal(
    isStillOpen({ submissionDeadline: '2026-09-19T00:00:00Z' }, reference),
    false,
  );
  assert.equal(isStillOpen({ submissionDeadline: undefined }, reference), true);
});

test('the curated catalogue is factual: every scheme has a title and a URL', () => {
  assert.ok(CURATED_AIDS.length >= 12);

  for (const aid of CURATED_AIDS) {
    assert.equal(aid.source, 'CURATED');
    assert.ok(aid.title.length > 10);
    assert.match(aid.url, /^https:\/\//);
    assert.ok(aid.audiences.length > 0);
  }

  const ids = CURATED_AIDS.map((aid) => aid.sourceId);

  assert.equal(new Set(ids).size, ids.length);
});

const ASSOCIATION_AID = {
  audiences: ['ASSOCIATION'],
  categories: ['Vie associative', 'Emploi'],
  region: undefined,
  perimeterScale: 'NATIONAL',
  searchText: 'fdva fonctionnement innovation association jeunesse',
  submissionDeadline: '2026-07-01T00:00:00Z',
  isEuropean: false,
  isCallForProject: false,
};

test('an aligned association profile scores high with readable reasons', () => {
  const result = scoreSubvention(
    ASSOCIATION_AID,
    {
      structureKind: 'ASSOCIATION',
      categories: ['Vie associative'],
      keywords: ['jeunesse'],
    },
    new Date('2026-06-01T00:00:00Z'),
  );

  assert.ok(result.score > 55);
  assert.ok(result.reasons.some((reason) => reason.includes('Public visé')));
  assert.ok(result.reasons.some((reason) => reason.includes('Thématique')));
  assert.ok(result.reasons.some((reason) => reason.includes('Mots-clés')));
});

test('a mismatched audience is penalised, never silently accepted', () => {
  const result = scoreSubvention(
    ASSOCIATION_AID,
    { structureKind: 'ENTREPRISE' },
    new Date('2026-06-01T00:00:00Z'),
  );

  assert.ok(result.reasons.some((reason) => reason.includes('Public visé différent')));
  assert.ok(result.score < 20);
});

test('an expired deadline collapses the score to zero', () => {
  const result = scoreSubvention(
    ASSOCIATION_AID,
    { structureKind: 'ASSOCIATION', categories: ['Vie associative'] },
    new Date('2027-01-01T00:00:00Z'),
  );

  assert.equal(result.score, 0);
  assert.ok(result.reasons.includes('Date limite dépassée'));
});

const CATALOGUE = [
  {
    ...ASSOCIATION_AID,
    aidTypes: ['Subvention'],
    isLive: true,
  },
  {
    audiences: ['ENTREPRISE'],
    categories: ['Innovation'],
    perimeterScale: 'NATIONAL',
    searchText: 'bpifrance innovation pret amorcage',
    submissionDeadline: undefined,
    isEuropean: false,
    isCallForProject: false,
    aidTypes: ['Prêt'],
    isLive: true,
  },
  {
    audiences: ['ASSOCIATION'],
    categories: ['Culture'],
    perimeterScale: 'EUROPEEN',
    searchText: 'erasmus mobilite jeunesse culture',
    submissionDeadline: '2026-06-15T00:00:00Z',
    isEuropean: true,
    isCallForProject: true,
    aidTypes: ['Subvention'],
    isLive: false,
  },
];

test('filters compose and a dead row never surfaces', () => {
  const reference = new Date('2026-06-01T00:00:00Z');

  assert.equal(filterSubventions(CATALOGUE, {}, reference).length, 2);
  assert.equal(
    filterSubventions(CATALOGUE, { audiences: ['ENTREPRISE'] }, reference).length,
    1,
  );
  assert.equal(
    filterSubventions(CATALOGUE, { query: 'innovation prêt' }, reference).length,
    1,
  );
  assert.equal(
    filterSubventions(CATALOGUE, { aidTypes: ['subvention'] }, reference).length,
    1,
  );
  assert.equal(
    filterSubventions(CATALOGUE, { deadlineWithinDays: 15 }, reference).length,
    0,
  );
  assert.equal(
    filterSubventions(CATALOGUE, { deadlineWithinDays: 45 }, reference).length,
    1,
  );
});

test('the AI cache key changes with the model and the catalogue version', () => {
  const base = {
    kind: 'subvention_match',
    model: 'gpt-x',
    payloadHash: 'abc',
    catalogVersion: 3,
  };

  assert.equal(buildAiCacheKey(base), buildAiCacheKey({ ...base }));
  assert.notEqual(buildAiCacheKey(base), buildAiCacheKey({ ...base, model: 'other' }));
  assert.notEqual(
    buildAiCacheKey(base),
    buildAiCacheKey({ ...base, catalogVersion: 4 }),
  );
});
