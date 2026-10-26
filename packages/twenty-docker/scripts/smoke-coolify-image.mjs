import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { setTimeout } from 'node:timers/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { STARTER_DOCUMENT_TEMPLATES } from '../../twenty-apps/internal/a2e-documents/src/lib/starter-templates.ts';
import { STARTER_PROJECT_TEMPLATES } from '../../twenty-apps/internal/a2e-projects/src/lib/starter-projects.ts';

import { BUNDLED_APPLICATION_NAMES } from './build-bundled-apps.mjs';
import { verifyAccountEntry } from './verify-account-entry.mjs';

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const REGISTRATIONS_QUERY = `SELECT COALESCE(json_agg(json_build_object('id', "id", 'universalIdentifier', "universalIdentifier", 'preInstalled', "isPreInstalled") ORDER BY "universalIdentifier"), '[]'::json)::text FROM core."applicationRegistration" WHERE "sourceType" = 'bundled'`;
const EXPECTED_STARTER_CONTENT = {
  templates: STARTER_DOCUMENT_TEMPLATES.length,
  projects: STARTER_PROJECT_TEMPLATES.length,
  projectTasks: STARTER_PROJECT_TEMPLATES.reduce(
    (total, project) => total + project.tasks.length,
    0,
  ),
  milestones: STARTER_PROJECT_TEMPLATES.reduce(
    (total, project) => total + project.milestones.length,
    0,
  ),
  channels: 2,
};
const STORAGE_MARKER_PATH =
  '/app/packages/twenty-server/.local-storage/.deployment-smoke-marker';

export const smokeCoolifyImage = async ({
  image,
  revision,
  reportDirectory = join(tmpdir(), `a2e-smoke-report-${randomUUID()}`),
  runDocker = (arguments_, options) =>
    execFileSync('docker', arguments_, {
      ...options,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }),
  fetchResponse = fetch,
  waitForRetry = setTimeout,
}) => {
  if (!image || !/^[a-f0-9]{40}$/.test(revision ?? ''))
    throw new Error('A smoke image and its full Git revision are required');

  const sandbox = mkdtempSync(join(tmpdir(), 'a2e-compose-smoke-'));
  const project = `a2e-smoke-${randomBytes(6).toString('hex')}`;
  const overridePath = join(sandbox, 'compose.override.json');
  const environment = {
    ...process.env,
    PG_DATABASE_USER: 'postgres',
    PG_DATABASE_PASSWORD: randomBytes(24).toString('hex'),
    PG_DATABASE_HOST: 'db',
    PG_DATABASE_PORT: '5432',
    PG_DATABASE_NAME: 'default',
    ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    APP_SECRET: randomBytes(32).toString('base64'),
    SERVER_URL: 'http://127.0.0.1:3000',
    LOGIC_FUNCTION_LOCAL_API_URL: 'http://server:3000',
    SERVER_PORT: '0',
    REDIS_URL: 'redis://redis:6379',
    STORAGE_TYPE: 'local',
    LOGIC_FUNCTION_TYPE: 'LOCAL',
    DISABLE_BUNDLED_APP_PROVISIONING: 'false',
    IS_SHARED_DOMAIN_WORKSPACE_ENABLED: 'true',
    IS_MULTIWORKSPACE_ENABLED: 'false',
    IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS: 'false',
    EMAIL_DRIVER: 'LOGGER',
  };
  mkdirSync(reportDirectory, { recursive: true });
  writeFileSync(
    overridePath,
    JSON.stringify({
      services: Object.fromEntries(
        ['server', 'worker'].map((service) => [
          service,
          { image, pull_policy: 'never', restart: 'no' },
        ]),
      ),
    }),
  );
  const docker = (arguments_, timeout = 30_000) =>
    runDocker(arguments_, { env: environment, timeout });
  const composeArguments = [
    'compose',
    '--project-name',
    project,
    '--file',
    join(REPOSITORY_ROOT, 'docker-compose.coolify.yml'),
    '--file',
    overridePath,
  ];
  const compose = (arguments_, timeout) =>
    docker([...composeArguments, ...arguments_], timeout);
  const queryDatabase = (query) =>
    compose([
      'exec',
      '-T',
      'db',
      'psql',
      '-U',
      'postgres',
      '-d',
      'default',
      '--set',
      'ON_ERROR_STOP=1',
      '-tAc',
      query,
    ]).trim();
  const phases = [];
  let failure;

  const verifyRuntime = async (phase) => {
    const binding = compose(['port', 'server', '3000']).trim().split('\n')[0];
    const port = binding.match(/:(\d+)$/)?.[1];
    if (!port) throw new Error(`Unexpected server port binding: ${binding}`);
    await verifyAccountEntry({
      url: environment.SERVER_URL,
      revision,
      fetchResponse: (endpoint, options) => {
        const localEndpoint = new URL(endpoint);
        localEndpoint.hostname = '127.0.0.1';
        localEndpoint.port = port;
        return fetchResponse(localEndpoint, options);
      },
    });
    const workerReadiness = compose([
      'exec',
      '-T',
      'worker',
      'curl',
      '--fail',
      '--silent',
      '--show-error',
      'http://127.0.0.1:3099/readyz',
    ]).trim();
    if (workerReadiness !== 'READY')
      throw new Error(`Worker is not ready: ${workerReadiness}`);
    const registrations = JSON.parse(queryDatabase(REGISTRATIONS_QUERY));
    if (
      registrations.length !== BUNDLED_APPLICATION_NAMES.length ||
      registrations.some((registration) => !registration.preInstalled)
    )
      throw new Error('Bundled application registrations are incomplete');
    phases.push(phase);
    return registrations;
  };

  try {
    console.log(`Testing ${image}: fresh database and worker startup`);
    compose(['up', '--detach', '--wait', '--wait-timeout', '600'], 630_000);
    const initialRegistrations = await verifyRuntime('fresh-start');
    // The native fixture creates a provisioned workspace without bundled apps.
    // Keeping the worker stopped exercises boot-time installs before the API listens.
    const workspaceId = randomUUID();
    compose(['stop', 'worker']);
    compose(
      [
        'exec',
        '-T',
        '-e',
        `E2E_SEED_WORKSPACE_ID=${workspaceId}`,
        'server',
        'yarn',
        'command:prod',
        'workspace:seed:dev',
        '--light',
      ],
      240_000,
    );
    const fixture = JSON.parse(
      queryDatabase(
        `SELECT json_build_object('schema', "databaseSchema", 'status', "activationStatus") FROM core.workspace WHERE id = '${workspaceId}'`,
      ) || 'null',
    );
    if (
      !fixture ||
      fixture.status !== 'ACTIVE' ||
      !/^workspace_[a-z0-9_]+$/.test(fixture.schema)
    )
      throw new Error(
        'The native workspace fixture did not finish provisioning',
      );
    const installedAppsQuery = `SELECT count(*) FROM core.application WHERE "workspaceId" = '${workspaceId}' AND "applicationRegistrationId" IN (SELECT id FROM core."applicationRegistration" WHERE "sourceType" = 'bundled') AND state = 'INSTALLED'`;
    if (queryDatabase(installedAppsQuery) !== '0')
      throw new Error('Boot fixture must start without bundled applications');
    const marker = randomUUID();
    compose([
      'exec',
      '-T',
      'server',
      'node',
      '-e',
      `require('node:fs').writeFileSync(${JSON.stringify(STORAGE_MARKER_PATH)}, process.argv[1])`,
      marker,
    ]);
    console.log(
      'Recreating server and worker with the same database/file volumes',
    );
    compose(['stop', 'worker', 'server']);
    compose(
      [
        'up',
        '--detach',
        '--force-recreate',
        '--wait',
        '--wait-timeout',
        '600',
        'server',
        'worker',
      ],
      630_000,
    );
    const restartedRegistrations = await verifyRuntime(
      'workspace-install-restart',
    );
    if (
      JSON.stringify(initialRegistrations) !==
      JSON.stringify(restartedRegistrations)
    )
      throw new Error('Bundled registrations changed identity during restart');
    const storedMarker = compose([
      'exec',
      '-T',
      'server',
      'node',
      '-e',
      `process.stdout.write(require('node:fs').readFileSync(${JSON.stringify(STORAGE_MARKER_PATH)}, 'utf8'))`,
    ]);
    if (storedMarker !== marker)
      throw new Error('File volume did not survive recreation');
    if (
      Number(queryDatabase(installedAppsQuery)) !==
      BUNDLED_APPLICATION_NAMES.length
    )
      throw new Error(
        'Workspace startup did not install every bundled application',
      );
    const starterContentQuery = `SELECT json_build_object('templates', (SELECT count(*) FROM "${fixture.schema}".document WHERE kind = 'TEMPLATE'), 'projects', (SELECT count(*) FROM "${fixture.schema}".project), 'projectTasks', (SELECT count(*) FROM "${fixture.schema}".task WHERE "projectId" IS NOT NULL), 'milestones', (SELECT count(*) FROM "${fixture.schema}".milestone), 'channels', (SELECT count(*) FROM "${fixture.schema}"."chatChannel"))`;
    let starterContent;
    for (let attempt = 0; attempt < 90; attempt++) {
      starterContent = JSON.parse(queryDatabase(starterContentQuery));
      if (
        Object.entries(EXPECTED_STARTER_CONTENT).every(
          ([kind, count]) => starterContent[kind] === count,
        )
      )
        break;
      if (attempt === 89)
        throw new Error(
          `Worker did not create starter content: ${JSON.stringify(starterContent)}`,
        );
      await waitForRetry(2_000);
    }
    phases.push('worker-post-install-content');
    compose(['stop', 'worker', 'server']);
    compose(
      [
        'up',
        '--detach',
        '--force-recreate',
        '--wait',
        '--wait-timeout',
        '600',
        'server',
        'worker',
      ],
      630_000,
    );
    await verifyRuntime('populated-restart');
    const restartedContent = JSON.parse(queryDatabase(starterContentQuery));
    if (JSON.stringify(starterContent) !== JSON.stringify(restartedContent))
      throw new Error('Restart duplicated or removed starter content');
  } catch (error) {
    failure = error;
  } finally {
    const containerIds = [];
    const capture = (name, operation) => {
      try {
        writeFileSync(join(reportDirectory, name), operation());
      } catch {
        // Diagnostics must not prevent isolated-stack cleanup.
      }
    };
    capture('containers.log', () => compose(['ps', '--all']));
    capture('startup.log', () =>
      compose(['logs', '--no-color', '--timestamps', '--tail', '1500']),
    );
    for (const service of ['db', 'redis', 'server', 'worker']) {
      capture(`${service}-state.json`, () => {
        const containerId = compose(['ps', '--all', '--quiet', service]).trim();
        if (!/^[a-f0-9]{12,64}$/.test(containerId)) return '{}';
        containerIds.push(containerId);
        return docker([
          'inspect',
          '--format',
          '{"state":{{json .State}},"restartCount":{{.RestartCount}},"image":{{json .Image}}}',
          containerId,
        ]);
      });
    }
    if (containerIds.length)
      capture('resources.log', () =>
        docker(['stats', '--no-stream', ...containerIds]),
      );
    try {
      // The random project owns disposable volumes; production project names never enter this command.
      compose(['down', '--volumes', '--remove-orphans'], 60_000);
    } catch (error) {
      failure = new AggregateError(
        failure === undefined ? [error] : [failure, error],
        'Smoke stack cleanup failed; inspect the deployment diagnostics',
      );
    }
    rmSync(sandbox, { recursive: true, force: true });
    writeFileSync(
      join(reportDirectory, 'result.json'),
      JSON.stringify(
        {
          image,
          revision,
          project,
          phases,
          passed: failure === undefined,
          error: failure === undefined ? undefined : failure.message,
        },
        null,
        2,
      ),
    );
  }
  if (failure !== undefined) throw failure;
  console.log(`Image smoke checks passed; diagnostics: ${reportDirectory}`);
};

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    await smokeCoolifyImage({
      image: process.env.A2E_SMOKE_IMAGE,
      revision: process.env.A2E_SMOKE_REVISION,
      reportDirectory: process.env.A2E_SMOKE_REPORT_DIR,
    });
  } catch (error) {
    console.error(`Image smoke checks failed: ${error.message}`);
    process.exitCode = 1;
  }
}
