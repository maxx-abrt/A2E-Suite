import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deployCoolifyRelease } from '../deploy-coolify-release.mjs';

const environment = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_APPLICATION_UUID: 'a2e-production',
  COOLIFY_API_TOKEN: 'test-only-secret',
  A2E_RELEASE_IMAGE: `ghcr.io/maxx-abrt/a2e-suite@sha256:${'b'.repeat(64)}`,
  A2E_RELEASE_REVISION: 'a'.repeat(40),
  GITHUB_REPOSITORY: 'maxx-abrt/A2E-Suite',
};
const application = {
  uuid: environment.COOLIFY_APPLICATION_UUID,
  git_repository: environment.GITHUB_REPOSITORY,
  git_branch: 'main',
  build_pack: 'dockercompose',
};
const queued = {
  deployments: [
    { resource_uuid: application.uuid, deployment_uuid: 'deployment-1' },
  ],
};
const run = async (responses, overrides = {}) => {
  const calls = [];
  const result = deployCoolifyRelease({
    environment,
    attempts: 2,
    wait: async () => {},
    fetchImplementation: async (url, options) => {
      calls.push({
        path: url.pathname,
        ...options,
        body: options.body ? JSON.parse(options.body) : undefined,
      });
      const response = responses.shift();
      assert.ok(response, 'unexpected API request');
      return response instanceof Response ? response : Response.json(response);
    },
    ...overrides,
  });
  return { result, calls };
};

test('pins the tested digest and Compose revision, deploys one application, and waits for completion', async () => {
  const { result, calls } = await run([
    application,
    {},
    {},
    queued,
    { status: 'in_progress' },
    { status: 'finished' },
  ]);
  assert.equal((await result).deploymentUuid, 'deployment-1');
  assert.deepEqual(calls[1].body.data, [
    {
      key: 'A2E_IMAGE',
      value: environment.A2E_RELEASE_IMAGE,
      is_preview: false,
      is_literal: true,
      is_runtime: true,
      is_buildtime: true,
    },
  ]);
  assert.deepEqual(calls[2].body, {
    git_commit_sha: environment.A2E_RELEASE_REVISION,
    is_auto_deploy_enabled: false,
  });
  assert.deepEqual(calls[3].body, { uuid: application.uuid, force: false });
  assert.equal(calls[3].method, 'POST');
  assert.ok(
    calls.every(
      (call) =>
        call.redirect === 'error' &&
        call.headers.Authorization === 'Bearer test-only-secret',
    ),
  );
});

test('rejects another repository or application before any mutation', async () => {
  for (const wrong of [
    { ...application, git_repository: 'owner/other' },
    { ...application, uuid: 'other' },
    { ...application, git_branch: 'develop' },
  ]) {
    const { result, calls } = await run([wrong]);
    await assert.rejects(result, /Target is not/);
    assert.equal(calls.length, 1);
  }
});

test('rejects mutable images and credential-bearing origins without sending credentials', async () => {
  for (const overrides of [
    { A2E_RELEASE_IMAGE: 'ghcr.io/maxx-abrt/a2e-suite:latest' },
    { COOLIFY_URL: 'https://secret@coolify.example.com' },
    { COOLIFY_APPLICATION_UUID: 'app,other' },
  ]) {
    const { result, calls } = await run([], {
      environment: { ...environment, ...overrides },
    });
    await assert.rejects(result);
    assert.equal(calls.length, 0);
  }
});

test('authentication failure stops writes and never exposes response bodies', async () => {
  const { result, calls } = await run([
    new Response('sensitive diagnostic', { status: 401 }),
  ]);
  await assert.rejects(result, { message: 'Coolify GET returned HTTP 401' });
  assert.equal(calls.length, 1);
});

test('missing or wrong deployment acknowledgement stops polling', async () => {
  for (const acknowledgement of [
    { deployments: [] },
    {
      deployments: [
        { resource_uuid: 'other', deployment_uuid: 'deployment-1' },
      ],
    },
  ]) {
    const { result, calls } = await run([application, {}, {}, acknowledgement]);
    await assert.rejects(result, /did not acknowledge/);
    assert.equal(calls.length, 4);
  }
});

test('failed or timed-out deployments cannot be reported as successful', async () => {
  for (const statuses of [['failed'], ['in_progress', 'in_progress']]) {
    const { result } = await run([
      application,
      {},
      {},
      queued,
      ...statuses.map((status) => ({ status })),
    ]);
    await assert.rejects(result, /failed|polling window/);
  }
});
