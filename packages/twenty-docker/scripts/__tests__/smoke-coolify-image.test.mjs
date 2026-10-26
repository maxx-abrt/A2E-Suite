import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { STARTER_DOCUMENT_TEMPLATES } from '../../../twenty-apps/internal/a2e-documents/src/lib/starter-templates.ts';
import { STARTER_PROJECT_TEMPLATES } from '../../../twenty-apps/internal/a2e-projects/src/lib/starter-projects.ts';

import { BUNDLED_APPLICATION_NAMES } from '../build-bundled-apps.mjs';
import { smokeCoolifyImage } from '../smoke-coolify-image.mjs';

const REVISION = 'a'.repeat(40);
const IMAGE = `a2e-test:${REVISION}`;
const registrations = BUNDLED_APPLICATION_NAMES.map((name) => ({
  id: name,
  universalIdentifier: name,
  preInstalled: true,
}));

const withFixture = async (operation, overrides = {}) => {
  const directory = mkdtempSync(join(tmpdir(), 'a2e-smoke-test-'));
  const calls = [];
  const fetchedUrls = [];
  let starts = 0;
  let marker;
  let override;
  let sandboxPath;
  const runDocker = (arguments_, options) => {
    calls.push(arguments_);
    assert.ok(options.timeout > 0);
    if (arguments_[0] !== 'compose') return '{}';
    const overrideIndex = arguments_.lastIndexOf('--file') + 1;
    sandboxPath = arguments_[overrideIndex];
    override = JSON.parse(readFileSync(sandboxPath, 'utf8'));
    const command = arguments_.slice(overrideIndex + 1);
    if (command[0] === 'up') {
      starts++;
      if (overrides.startFailure) throw new Error('server unhealthy');
    }
    if (command[0] === 'down' && overrides.cleanupFailure)
      throw new Error('cleanup failed');
    if (command[0] === 'port') return '0.0.0.0:45678\n';
    if (command[0] === 'ps' && command.includes('--quiet'))
      return 'a'.repeat(64);
    if (command.includes('curl')) return overrides.workerReadiness ?? 'READY';
    if (command.includes('psql')) {
      const query = command.at(-1);
      if (query.includes('json_agg'))
        return JSON.stringify(
          overrides.registrations ??
            (overrides.changedIdentity && starts > 1
              ? registrations.map((registration) => ({
                  ...registration,
                  id: `changed-${registration.id}`,
                }))
              : registrations),
        );
      if (query.includes('core.workspace'))
        return JSON.stringify(
          overrides.fixture ?? { schema: 'workspace_smoke', status: 'ACTIVE' },
        );
      if (query.startsWith('SELECT count(*) FROM core.application'))
        return starts === 1 ? '0' : String(registrations.length);
      if (query.includes('TEMPLATE'))
        return JSON.stringify({
          templates: overrides.missingContent
            ? 0
            : STARTER_DOCUMENT_TEMPLATES.length,
          projects:
            overrides.duplicateContent && starts === 3
              ? 24
              : STARTER_PROJECT_TEMPLATES.length,
          projectTasks: overrides.missingTasks
            ? 0
            : STARTER_PROJECT_TEMPLATES.reduce(
                (total, project) => total + project.tasks.length,
                0,
              ),
          milestones: STARTER_PROJECT_TEMPLATES.reduce(
            (total, project) => total + project.milestones.length,
            0,
          ),
          channels: 2,
        });
      throw new Error(`Unexpected query: ${query}`);
    }
    if (command.includes('node')) {
      if (command.some((argument) => argument.includes('writeFileSync')))
        marker = command.at(-1);
      else return overrides.lostStorage ? 'missing-marker' : marker;
    }
    return '';
  };
  const fetchResponse = async (url) => {
    fetchedUrls.push(url);
    return new Response(
      JSON.stringify(
        url.pathname === '/client-config'
          ? {
              appRevision: overrides.revision ?? REVISION,
              isMultiWorkspaceEnabled: true,
              isSharedDomainWorkspaceEnabled: true,
              frontDomain: '127.0.0.1',
            }
          : url.pathname === '/release.json'
            ? { revision: REVISION, accountEntry: 'shared-domain' }
            : {
                status: 'ok',
                details: {
                  database: { status: 'up' },
                  redis: { status: 'up' },
                },
              },
      ),
    );
  };
  try {
    await operation({
      execute: () =>
        smokeCoolifyImage({
          image: IMAGE,
          revision: REVISION,
          reportDirectory: directory,
          runDocker,
          fetchResponse,
          waitForRetry: async () => {},
        }),
      calls,
      fetchedUrls,
      result: () =>
        JSON.parse(readFileSync(join(directory, 'result.json'), 'utf8')),
      override: () => override,
      sandboxExists: () => existsSync(sandboxPath),
      directory,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

test('checks fresh startup, boot-time app installs, worker seeds and a populated restart using the exact Coolify stack', async () => {
  await withFixture(
    async ({
      execute,
      calls,
      result,
      fetchedUrls,
      override,
      sandboxExists,
    }) => {
      await execute();
      assert.equal(result().passed, true);
      assert.deepEqual(result().phases, [
        'fresh-start',
        'workspace-install-restart',
        'worker-post-install-content',
        'populated-restart',
      ]);
      assert.ok(
        calls.some((arguments_) =>
          arguments_.some((argument) =>
            argument.endsWith('/docker-compose.coolify.yml'),
          ),
        ),
      );
      assert.ok(
        calls.some(
          (arguments_) =>
            arguments_.includes('workspace:seed:dev') &&
            arguments_.includes('--light'),
        ),
      );
      assert.deepEqual(
        Object.values(override().services).map((service) => service.image),
        [IMAGE, IMAGE],
      );
      assert.equal(fetchedUrls.length, 9);
      assert.ok(
        fetchedUrls.every((url) => url.origin === 'http://127.0.0.1:45678'),
      );
      const cleanup = calls.find((arguments_) => arguments_.includes('down'));
      assert.match(
        cleanup[cleanup.indexOf('--project-name') + 1],
        /^a2e-smoke-[a-f0-9]{12}$/,
      );
      assert.ok(cleanup.includes('--volumes'));
      assert.equal(sandboxExists(), false);
    },
  );
});

for (const [name, overrides, message] of [
  [
    'missing starter tasks',
    { missingTasks: true },
    /Worker did not create starter content/,
  ],
  ['unhealthy server', { startFailure: true }, /server unhealthy/],
  ['lost file volume', { lostStorage: true }, /File volume did not survive/],
  [
    'changed registration identities',
    { changedIdentity: true },
    /changed identity/,
  ],
  [
    'unfinished worker seeds',
    { missingContent: true },
    /Worker did not create starter content/,
  ],
  ['cleanup failure', { cleanupFailure: true }, /Smoke stack cleanup failed/],
  ['unready worker', { workerReadiness: 'NOT READY' }, /Worker is not ready/],
  ['mixed release', { revision: 'b'.repeat(40) }, /Backend revision/],
  [
    'missing registrations',
    { registrations: [] },
    /registrations are incomplete/,
  ],
  [
    'incomplete workspace seed',
    { fixture: { schema: 'workspace_smoke', status: 'PENDING_CREATION' } },
    /fixture did not finish/,
  ],
  [
    'duplicate seeds after restart',
    { duplicateContent: true },
    /duplicated or removed starter content/,
  ],
]) {
  test(`rejects ${name}, captures diagnostics and removes only its isolated stack`, async () => {
    await withFixture(async ({ execute, calls, result, directory }) => {
      await assert.rejects(execute(), message);
      assert.equal(result().passed, false);
      assert.ok(existsSync(join(directory, 'startup.log')));
      assert.ok(existsSync(join(directory, 'server-state.json')));
      assert.equal(
        calls.filter((arguments_) => arguments_.includes('down')).length,
        1,
      );
    }, overrides);
  });
}

test('refuses a missing image or mutable revision before invoking Docker', async () => {
  for (const parameters of [
    { image: IMAGE, revision: 'latest' },
    { revision: REVISION },
  ]) {
    await assert.rejects(
      smokeCoolifyImage({
        ...parameters,
        runDocker: () => assert.fail('Docker should not run'),
      }),
      /full Git revision/,
    );
  }
});
