import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  parseCarenewsAids,
  parseCarenewsListing,
} from '../carenews-parse.ts';

// Verbatim markup from https://www.carenews.com/appels_a_projets (two cards).
const LISTING = `
<div class="col-lg-6">
    <div class="listing__item">
      <div class="job-thumbnail">
        <div class="job-thumbnail__type">Appel à projets</div>
        <div class="job-thumbnail__area">   </div>
        <h3 class="job-thumbnail__title"><a href="/appels-a-projet/prix-inspiring-young-europeans-2026"> Prix Inspiring Young Europeans 2026&#039; &amp; Co  - </a></h3>
        <div class="job-thumbnail__text">
            Prix Inspiring Young Europeans 2026 : mettez de l&#039;Europe dans vos projets !
        </div>
        <div class="job-thumbnail__wrapper">
          <div class="job-thumbnail__box">
            <div class="job-thumbnail__company">
              Par  Fondation Hippocrène </div>
            <div class="job-thumbnail__date-start">
              Publié le :  24.06.2026         </div>
            <div class="job-thumbnail__date-end">
              Date de clôture :  28.08.2026        </div>
          </div>
        </div>
      </div>
    </div>
</div>
<div class="col-lg-6">
    <div class="listing__item">
      <div class="job-thumbnail">
        <div class="job-thumbnail__type">Appel à projets</div>
        <h3 class="job-thumbnail__title"><a href="/appels-a-projet/les-victoires-by-garance"> Les Victoires by Garance  - </a></h3>
        <div class="job-thumbnail__text">
            Les Victoires by Garance font leur grand retour pour une 4e édition !&nbsp;
        </div>
        <div class="job-thumbnail__wrapper">
          <div class="job-thumbnail__box">
            <div class="job-thumbnail__company">
              Par  </div>
            <div class="job-thumbnail__date-start">
              Publié le :  17.06.2026         </div>
            <div class="job-thumbnail__date-end">
              Date de clôture :  30.06.2026        </div>
          </div>
        </div>
      </div>
    </div>
</div>
`;

test('lit chaque carte de la liste Carenews', () => {
  const calls = parseCarenewsListing(LISTING);

  assert.equal(calls.length, 2);

  const [first, second] = calls;

  assert.equal(first.path, '/appels-a-projet/prix-inspiring-young-europeans-2026');
  assert.equal(first.title, "Prix Inspiring Young Europeans 2026' & Co -");
  assert.equal(first.publisher, 'Fondation Hippocrène');
  assert.equal(first.publishedAtLabel, '24.06.2026');
  assert.equal(first.deadlineLabel, '28.08.2026');
  assert.match(first.description ?? '', /mettez de l'Europe/);

  assert.equal(second.title, 'Les Victoires by Garance -');
  assert.equal(second.publisher, undefined);
});

test('normalise les cartes en aides prêtes à stocker', () => {
  const aids = parseCarenewsAids(LISTING);

  assert.equal(aids.length, 2);

  const [first] = aids;

  assert.equal(first.source, 'CARENEWS');
  assert.equal(first.sourceId, 'prix-inspiring-young-europeans-2026');
  assert.equal(
    first.sourceKey,
    'CARENEWS:prix-inspiring-young-europeans-2026',
  );
  assert.equal(first.isCallForProject, true);
  assert.deepEqual(first.audiences, ['ASSOCIATION']);
  assert.equal(first.financers[0], 'Fondation Hippocrène');
  assert.equal(first.submissionDeadline, '2026-08-28T00:00:00.000Z');
  assert.equal(
    first.url,
    'https://www.carenews.com/appels-a-projet/prix-inspiring-young-europeans-2026',
  );
  assert.equal(first.contentHash.length, 16);
});

test('ignore un bloc sans lien de fiche', () => {
  assert.equal(
    parseCarenewsListing('<div class="job-thumbnail">rien ici</div>').length,
    0,
  );
});
