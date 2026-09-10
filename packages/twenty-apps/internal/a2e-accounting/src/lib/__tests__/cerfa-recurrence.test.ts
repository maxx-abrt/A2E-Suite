import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildCerfa12156,
  buildCerfa15059,
  buildCerfaForm,
  cerfaCompletionPercent,
} from '../cerfa.ts';
import { dueOccurrences, isOverdue, nextOccurrence } from '../recurrence.ts';

const PROFILE = {
  legalName: 'Association 2E',
  shortName: 'A2E',
  objet: 'Éducation populaire',
  rna: 'W123456789',
  siret: '12345678900012',
  addressLine: '10 rue des Lilas',
  postalCode: '75011',
  city: 'Paris',
  email: 'contact@a2e.org',
  phone: '0100000000',
  representativeName: 'Camille Martin',
  representativeRole: 'Présidente',
  rupRecognized: false,
  fiscalRegime: 'Non assujettie',
};

test('CERFA 12156 fills identity from the org profile and flags what is missing', () => {
  const form = buildCerfa12156(PROFILE, {
    fundingBody: 'DRAJES Île-de-France',
    amountRequested: 8000,
    requestType: 'projet',
    year: '2026',
  });

  const identity = form.sections[0];

  assert.equal(form.reference, '12156*06');
  assert.equal(identity.fields[0].value, 'Association 2E');
  assert.equal(identity.fields[5].value, '10 rue des Lilas 75011 Paris');
  assert.ok(form.missingFieldCodes.includes('6.1'));
  assert.ok(!form.missingFieldCodes.includes('1.1'));
});

test('the fiche payload overrides the profile, never the other way round', () => {
  const form = buildCerfa12156(PROFILE, { legalName: 'Nouveau nom' });

  assert.equal(form.sections[0].fields[0].value, 'Nouveau nom');
});

test('money and dates are rendered in French, and zero is treated as empty', () => {
  const form = buildCerfa12156(PROFILE, {
    amountRequested: 8000,
    signatureDate: '2026-06-01',
  });

  assert.match(form.sections[4].fields[2].value, /8\s?000,00/);
  assert.equal(form.sections[6].fields[1].value, '1 juin 2026');

  const empty = buildCerfa12156(PROFILE, { amountRequested: 0 });

  assert.equal(empty.sections[4].fields[2].value, '');
});

test('CERFA 15059 renders the regime, forme, nature and versement labels', () => {
  const form = buildCerfa15059(PROFILE, {
    receiptNumber: 'RF-2026-0001',
    regime: { art200: true, art238bis: false },
    orgCategory: "Œuvre d'intérêt général",
    donorCivility: 'Monsieur',
    donorName: 'Jean Dupont',
    donorAddress: '2 place Centrale, 75001 Paris',
    amount: 150,
    donDate: '2026-02-14',
    forme: 'don_manuel',
    nature: 'numeraire',
    modeVersement: 'virement',
    signatureCity: 'Paris',
    signatureDate: '2026-02-15',
  });

  assert.equal(form.reference, '15059*03');
  assert.equal(form.sections[0].fields[5].value, 'Article 200 du CGI — particuliers');
  assert.equal(form.sections[2].fields[2].value, 'Don manuel');
  assert.equal(form.sections[2].fields[4].value, 'Virement, prélèvement ou carte bancaire');
  assert.equal(form.sections[3].fields[2].value, 'Camille Martin');
  assert.deepEqual(form.missingFieldCodes, []);
  assert.equal(cerfaCompletionPercent(form), 100);
});

test('an unmapped select value is printed verbatim rather than dropped', () => {
  const form = buildCerfa15059(PROFILE, { forme: 'autre_forme' });

  assert.equal(form.sections[2].fields[2].value, 'autre_forme');
});

test('the completion percent reflects the missing fields', () => {
  const form = buildCerfaForm('CERFA_15059', PROFILE, {});
  const percent = cerfaCompletionPercent(form);

  assert.ok(percent > 0 && percent < 100);
});

test('monthly recurrence clamps the end of the month', () => {
  assert.equal(
    nextOccurrence(new Date('2026-01-31T00:00:00Z'), 'MONTHLY')
      .toISOString()
      .slice(0, 10),
    '2026-02-28',
  );
  assert.equal(
    nextOccurrence(new Date('2026-01-15T00:00:00Z'), 'MONTHLY')
      .toISOString()
      .slice(0, 10),
    '2026-02-15',
  );
});

test('weekly, quarterly and yearly recurrences advance the right amount', () => {
  const from = new Date('2026-03-10T00:00:00Z');

  assert.equal(
    nextOccurrence(from, 'WEEKLY').toISOString().slice(0, 10),
    '2026-03-17',
  );
  assert.equal(
    nextOccurrence(from, 'QUARTERLY').toISOString().slice(0, 10),
    '2026-06-10',
  );
  assert.equal(
    nextOccurrence(from, 'YEARLY').toISOString().slice(0, 10),
    '2027-03-10',
  );
});

test('a generator that was offline catches up without exceeding the cap', () => {
  const occurrences = dueOccurrences(
    new Date('2026-01-01T00:00:00Z'),
    'MONTHLY',
    new Date('2026-04-15T00:00:00Z'),
  );

  assert.equal(occurrences.length, 4);

  const capped = dueOccurrences(
    new Date('2020-01-01T00:00:00Z'),
    'MONTHLY',
    new Date('2026-01-01T00:00:00Z'),
    12,
  );

  assert.equal(capped.length, 12);
});

test('overdue compares calendar days, not timestamps', () => {
  const reference = new Date('2026-06-10T23:00:00Z');

  assert.equal(isOverdue('2026-06-09', reference), true);
  assert.equal(isOverdue('2026-06-10T01:00:00Z', reference), false);
});
