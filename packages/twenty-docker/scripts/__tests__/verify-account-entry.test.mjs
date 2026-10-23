import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { verifyAccountEntry } from '../verify-account-entry.mjs';
import { writeFrontendRelease } from '../write-frontend-release.mjs';

const REVISION = 'a'.repeat(40);
const configuration = {
  appRevision: REVISION,
  isMultiWorkspaceEnabled: true,
  isSharedDomainWorkspaceEnabled: true,
  frontDomain: 'bureau.example.com',
};
const release = {
  revision: REVISION,
  accountEntry: 'shared-domain',
  artifactFormat: 1,
};
const fetchFixture =
  (config = configuration, metadata = release) =>
  async (url) =>
    new Response(
      JSON.stringify(url.pathname === '/client-config' ? config : metadata),
    );

test('verifies the same tested frontend/backend and shared account mode', async () => {
  assert.deepEqual(
    await verifyAccountEntry({
      url: 'https://bureau.example.com',
      revision: REVISION,
      fetchResponse: fetchFixture(),
    }),
    { origin: 'https://bureau.example.com', revision: REVISION },
  );
});

test('rejects the old production signature even if HTTP and application version look healthy', async () => {
  await assert.rejects(
    verifyAccountEntry({
      url: 'https://bureau.example.com',
      revision: REVISION,
      fetchResponse: fetchFixture({
        appVersion: '0.2.1',
        isMultiWorkspaceEnabled: false,
        frontDomain: 'bureau.example.com',
      }),
    }),
    /Backend revision is missing[\s\S]*Shared-domain account\/workspace mode is not enabled/,
  );
});

test('rejects a mixed deployment with old frontend assets', async () => {
  await assert.rejects(
    verifyAccountEntry({
      url: 'https://bureau.example.com',
      revision: REVISION,
      fetchResponse: fetchFixture(configuration, {
        ...release,
        revision: 'b'.repeat(40),
      }),
    }),
    /Frontend revision/,
  );
});

test('rejects a SPA fallback in place of release metadata', async () => {
  await assert.rejects(
    verifyAccountEntry({
      url: 'https://bureau.example.com',
      revision: REVISION,
      fetchResponse: async (url) =>
        url.pathname === '/client-config'
          ? new Response(JSON.stringify(configuration))
          : new Response('<html>old app</html>'),
    }),
    /release.json is not JSON/,
  );
});

test('does not accept a mutable tag as release identity', async () => {
  await assert.rejects(
    verifyAccountEntry({
      url: 'https://bureau.example.com',
      revision: 'latest',
      fetchResponse: fetchFixture(),
    }),
    /full tested Git commit SHA/,
  );
});

test('rejects a shared account portal configured for another host', async () => {
  await assert.rejects(
    verifyAccountEntry({
      url: 'https://bureau.example.com',
      revision: REVISION,
      fetchResponse: fetchFixture({
        ...configuration,
        frontDomain: 'app.old.example.com',
      }),
    }),
    /Configured frontend host/,
  );
});

test('writes release metadata only after a real frontend entry exists', () => {
  const directory = mkdtempSync(join(tmpdir(), 'a2e-frontend-release-'));
  try {
    assert.throws(
      () => writeFrontendRelease(directory, REVISION),
      /no index.html/,
    );
    writeFileSync(join(directory, 'index.html'), '<html></html>');
    writeFrontendRelease(directory, REVISION);
    assert.deepEqual(
      JSON.parse(readFileSync(join(directory, 'release.json'), 'utf8')),
      release,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
