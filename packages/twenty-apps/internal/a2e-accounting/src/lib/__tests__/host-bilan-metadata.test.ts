import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FRONT_COMPONENT_IDS, OBJECT_IDS, PAGE_LAYOUT_IDS } from '../../constants/universal-identifiers.ts';

const hostSource = readFileSync(new URL('../../../../../../twenty-front/src/modules/bilan/constants/BilanMetadata.ts', import.meta.url), 'utf8');

test('host Bilan entry points use the identities of their actual metadata kinds', () => {
  const identities = {
    quickEntry: FRONT_COMPONENT_IDS.quickEntry,
    dashboard: PAGE_LAYOUT_IDS.dashboard,
    catalog: PAGE_LAYOUT_IDS.subventionExplorer,
    invoice: OBJECT_IDS.invoice,
    financeEntry: OBJECT_IDS.financeEntry,
    organization: OBJECT_IDS.orgProfile,
    bookEntry: OBJECT_IDS.bookEntry,
  };
  for (const [name, identifier] of Object.entries(identities)) {
    assert.equal(hostSource.match(new RegExp(`${name}:\\s*'([^']+)'`))?.[1], identifier, `Host ${name} must target its app-owned metadata identity`);
  }
});
