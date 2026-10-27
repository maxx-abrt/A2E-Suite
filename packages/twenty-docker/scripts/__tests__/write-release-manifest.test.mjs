import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createReleaseManifest } from '../write-release-manifest.mjs';

const INPUT = {
  image: 'ghcr.io/maxx-abrt/a2e-suite',
  revision: 'a'.repeat(40),
  digest: `sha256:${'b'.repeat(64)}`,
  version: '0.2.1',
  buildId: '51.2',
  builtAt: '2026-10-27T00:00:00Z',
  runUrl: 'https://github.com/maxx-abrt/A2E-Suite/actions/runs/123',
};

test('records the exact tested digest and separates image acceptance from live verification', () => {
  const manifest = createReleaseManifest(INPUT);
  assert.equal(manifest.image, `${INPUT.image}@${INPUT.digest}`);
  assert.equal(manifest.buildId, '51.2');
  assert.equal(manifest.candidateVerified, true);
  assert.equal(manifest.liveDeploymentVerified, false);
});

test('writes a downloadable release record and summary from the actual CI environment contract', () => {
  const directory = mkdtempSync(join(tmpdir(), 'a2e-release-record-'));
  try {
    const summary = join(directory, 'summary.md');
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL('../write-release-manifest.mjs', import.meta.url),
        ),
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          IMAGE: INPUT.image,
          RELEASE_REVISION: INPUT.revision,
          RELEASE_DIGEST: INPUT.digest,
          RELEASE_VERSION: INPUT.version,
          RELEASE_BUILD_ID: INPUT.buildId,
          RELEASE_BUILT_AT: INPUT.builtAt,
          RELEASE_RUN_URL: INPUT.runUrl,
          A2E_SMOKE_REPORT_DIR: directory,
          GITHUB_STEP_SUMMARY: summary,
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      JSON.parse(readFileSync(join(directory, 'release.json'), 'utf8')),
      createReleaseManifest(INPUT),
    );
    assert.ok(
      readFileSync(summary, 'utf8').includes(
        `A2E_IMAGE=${INPUT.image}@${INPUT.digest}`,
      ),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

for (const [field, invalid] of Object.entries({
  image: 'https://example.com/image',
  revision: 'main',
  digest: 'latest',
  version: 'next',
  buildId: '0.0',
  builtAt: 'yesterday',
  runUrl: 'javascript:alert(1)',
})) {
  test(`refuses invalid release ${field}`, () =>
    assert.throws(() => createReleaseManifest({ ...INPUT, [field]: invalid })));
}
