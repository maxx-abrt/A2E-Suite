import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const workflow = readFileSync(
  new URL(
    '../../../../.github/workflows/cd-docker-image.yaml',
    import.meta.url,
  ),
  'utf8',
);
const promotion = workflow
  .split('      - name: Promote tested image\n')[1]
  .split('\n      - name:')[0]
  .split('        run: |\n')[1]
  .split('\n')
  .map((line) => line.replace(/^ {10}/, ''))
  .join('\n');
const REVISION = 'a'.repeat(40);

const runPromotion = (overrides = {}) => {
  const sandbox = mkdtempSync(join(tmpdir(), 'a2e-promotion-policy-'));
  const bin = join(sandbox, 'bin');
  mkdirSync(bin);
  writeFileSync(
    join(bin, 'gh'),
    '#!/bin/sh\nif [ "$A2E_TEST_GITHUB_FAILURE" = true ]; then exit 1; fi\nprintf "%s\\n" "$A2E_TEST_MAIN_REVISION"\n',
  );
  writeFileSync(
    join(bin, 'docker'),
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$A2E_TEST_CALLS"\n',
  );
  for (const executable of ['gh', 'docker'])
    chmodSync(join(bin, executable), 0o755);
  const callsFile = join(sandbox, 'calls');
  const outputFile = join(sandbox, 'outputs');
  try {
    const result = spawnSync(
      'bash',
      ['--noprofile', '--norc', '-euo', 'pipefail', '-c', promotion],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          IMAGE: 'ghcr.io/maxx-abrt/a2e-suite',
          TESTED_REVISION: REVISION,
          TESTED_DIGEST: `sha256:${'b'.repeat(64)}`,
          APP_VERSION: '0.2.1',
          RELEASE_BUILD_ID: '51.2',
          RELEASE_REF: 'refs/heads/main',
          RELEASE_TAG: 'main',
          GITHUB_REPOSITORY: 'maxx-abrt/A2E-Suite',
          GITHUB_OUTPUT: outputFile,
          GITHUB_STEP_SUMMARY: join(sandbox, 'summary'),
          A2E_TEST_CALLS: callsFile,
          A2E_TEST_MAIN_REVISION: REVISION,
          ...overrides,
        },
      },
    );
    return {
      exitCode: result.status,
      calls: existsSync(callsFile)
        ? readFileSync(callsFile, 'utf8').split('\n')
        : [],
      outputs: existsSync(outputFile) ? readFileSync(outputFile, 'utf8') : '',
    };
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
};

test('promotes the tested current main revision and marks it eligible for deployment', () => {
  const result = runPromotion();
  assert.equal(result.exitCode, 0);
  assert.ok(result.calls.includes('ghcr.io/maxx-abrt/a2e-suite:latest'));
  assert.match(result.outputs, /channel_promoted=true/);
});

test('historical main reruns cannot roll back latest or trigger an automatic deployment', () => {
  const result = runPromotion({ A2E_TEST_MAIN_REVISION: 'c'.repeat(40) });
  assert.equal(result.exitCode, 0);
  assert.ok(!result.calls.includes('ghcr.io/maxx-abrt/a2e-suite:latest'));
  assert.ok(result.calls.includes(`ghcr.io/maxx-abrt/a2e-suite:${REVISION}`));
  assert.match(result.outputs, /channel_promoted=false/);
});

test('release tags and feature builds publish identity without replacing the main channel', () => {
  for (const ref of ['refs/tags/v0.2.1', 'refs/heads/feature']) {
    const result = runPromotion({
      RELEASE_REF: ref,
      RELEASE_TAG: ref.split('/').at(-1),
    });
    assert.equal(result.exitCode, 0);
    assert.ok(!result.calls.includes('ghcr.io/maxx-abrt/a2e-suite:latest'));
    assert.match(result.outputs, /channel_promoted=false/);
  }
});

test('refuses promotion when the current main revision cannot be checked', () => {
  const result = runPromotion({ A2E_TEST_GITHUB_FAILURE: 'true' });
  assert.notEqual(result.exitCode, 0);
  assert.deepEqual(result.calls, []);
});
