import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assistRecordEnrichment } from '../handlers/assist-record-enrichment-handler.ts';
import { buildFakeCoreClient, findQuery } from './crm-tool-test-fixtures.ts';

// Contract with the Core API: the caller-context `person` / `company` query
// returns the record or `null`. Missing and unauthorized are the same `null` at
// this boundary, so both fail closed. The handler is read-only by type — only
// `query` exists on its client — and never calls an enrichment provider.

test('a person record reports its identity fields and the empty ones', async () => {
  const { client, calls } = buildFakeCoreClient({
    person: {
      id: 'person-1',
      name: { firstName: 'Ada', lastName: 'Lovelace' },
      emails: { primaryEmail: 'ada@acme.test' },
      phones: { primaryPhoneNumber: null },
      jobTitle: null,
      linkedinLink: { primaryLinkUrl: null },
      companyId: 'company-9',
    },
  });

  const result = await assistRecordEnrichment({ personId: 'person-1' }, client);

  assert.equal(result.status, 'READ');
  assert.equal(result.target, 'PERSON');
  assert.equal(result.recordId, 'person-1');
  assert.equal(result.displayName, 'Ada Lovelace');
  assert.deepEqual(result.missingFieldNames, [
    'phones.primaryPhoneNumber',
    'jobTitle',
    'linkedinLink.primaryLinkUrl',
  ]);
  assert.deepEqual(
    result.fields.map((field) => field.fieldName),
    [
      'name.firstName',
      'name.lastName',
      'emails.primaryEmail',
      'phones.primaryPhoneNumber',
      'jobTitle',
      'linkedinLink.primaryLinkUrl',
      'companyId',
    ],
  );
  // Exactly one caller-scoped read of the native person object, by id.
  assert.deepEqual(findQuery(calls, 'person')?.args, { id: 'person-1' });
  assert.equal(calls.length, 1);
});

test('a company record reports its identity fields and the empty ones', async () => {
  const { client, calls } = buildFakeCoreClient({
    company: {
      id: 'company-9',
      name: 'Acme',
      domainName: { primaryLinkUrl: 'https://acme.test' },
      linkedinLink: { primaryLinkUrl: null },
      address: { addressCity: 'Paris', addressCountry: null },
    },
  });

  const result = await assistRecordEnrichment(
    { companyId: 'company-9' },
    client,
  );

  assert.equal(result.status, 'READ');
  assert.equal(result.target, 'COMPANY');
  assert.equal(result.displayName, 'Acme');
  assert.deepEqual(result.missingFieldNames, [
    'linkedinLink.primaryLinkUrl',
    'address.addressCountry',
  ]);
  assert.deepEqual(findQuery(calls, 'company')?.args, { id: 'company-9' });
  assert.equal(calls.length, 1);
});

test('two ids is a caller mistake refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const result = await assistRecordEnrichment(
    { personId: 'person-1', companyId: 'company-9' },
    client,
  );

  assert.equal(result.status, 'INVALID_INPUT');
  assert.equal(result.target, null);
  assert.equal(calls.length, 0);
});

test('no id is a caller mistake refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const result = await assistRecordEnrichment({}, client);

  assert.equal(result.status, 'INVALID_INPUT');
  assert.equal(calls.length, 0);
});

test('the record id is trimmed before the read', async () => {
  const { client, calls } = buildFakeCoreClient({
    person: { id: 'person-1', name: { firstName: 'Ada' } },
  });

  const result = await assistRecordEnrichment(
    { personId: '  person-1  ' },
    client,
  );

  assert.equal(result.recordId, 'person-1');
  assert.deepEqual(findQuery(calls, 'person')?.args, { id: 'person-1' });
});

test('a missing or unauthorized record fails closed', async () => {
  const { client } = buildFakeCoreClient({ person: null });

  const result = await assistRecordEnrichment({ personId: 'person-1' }, client);

  assert.deepEqual(result, {
    status: 'RECORD_NOT_FOUND',
    target: 'PERSON',
    recordId: 'person-1',
    displayName: null,
    fields: [],
    missingFieldNames: [],
  });
});

test('a company without a name has no display name', async () => {
  const { client } = buildFakeCoreClient({
    company: { id: 'company-9', name: null },
  });

  const result = await assistRecordEnrichment(
    { companyId: 'company-9' },
    client,
  );

  assert.equal(result.status, 'READ');
  assert.equal(result.displayName, null);
});
