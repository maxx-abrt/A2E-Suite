import { execFileSync } from 'child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

// M1 boot contract for `app:provision-bundled` + `install-pre-installed-apps`
// (US-087). Both commands write registrations and install apps on every
// workspace, so they must run exactly once per boot, after the upgrade, in the
// container that owns migrations. The worker shares the image and therefore
// the entrypoint; before US-087 every worker container re-ran both commands
// concurrently with the server (podman-compose has no start ordering at all,
// and `restart: always` re-runs them on every worker restart). The documented
// `DISABLE_BUNDLED_APP_PROVISIONING=true` opt-out was also never passed to the
// server container by any compose file.

const findRepositoryRoot = (): string => {
  let directory = __dirname;

  while (!existsSync(join(directory, 'packages', 'twenty-docker'))) {
    const parentDirectory = dirname(directory);

    if (parentDirectory === directory) {
      throw new Error('Repository root with packages/twenty-docker not found');
    }

    directory = parentDirectory;
  }

  return directory;
};

const repositoryRoot = findRepositoryRoot();
const twentyDockerDirectory = join(repositoryRoot, 'packages', 'twenty-docker');
const entrypointPath = join(twentyDockerDirectory, 'twenty', 'entrypoint.sh');

type EntrypointRun = {
  yarnCalls: string[];
  output: string;
};

// Runs the real entrypoint under /bin/sh with `yarn` and `psql` stubbed on
// PATH: no database, no server, only the sequence of commands it would issue.
const runEntrypoint = (environment: Record<string, string>): EntrypointRun => {
  const sandbox = mkdtempSync(join(tmpdir(), 'twenty-entrypoint-spec-'));
  const binDirectory = join(sandbox, 'bin');
  const yarnCallsFile = join(sandbox, 'yarn-calls.log');

  mkdirSync(binDirectory);
  writeFileSync(
    join(binDirectory, 'yarn'),
    `#!/bin/sh\necho "$*" >> "${yarnCallsFile}"\n`,
  );
  // `t`: the core schema already has its tables, so no database:init:prod.
  writeFileSync(join(binDirectory, 'psql'), '#!/bin/sh\necho t\n');
  chmodSync(join(binDirectory, 'yarn'), 0o755);
  chmodSync(join(binDirectory, 'psql'), 0o755);

  try {
    const output = execFileSync('/bin/sh', [entrypointPath, 'true'], {
      env: {
        PATH: `${binDirectory}:/usr/local/bin:/usr/bin:/bin`,
        PG_DATABASE_URL: 'postgres://stub',
        ...environment,
      },
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const yarnCalls = existsSync(yarnCallsFile)
      ? readFileSync(yarnCallsFile, 'utf8')
          .split('\n')
          .filter((line) => line.length > 0)
      : [];

    return { yarnCalls, output };
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
};

const PROVISION_BUNDLED = 'command:prod app:provision-bundled';
const INSTALL_PRE_INSTALLED = 'command:prod install-pre-installed-apps';
const UPGRADE = 'command:prod upgrade';

type ComposeService = {
  name: string;
  command: string;
  environment: Record<string, string>;
};

const unquote = (value: string): string =>
  value.replace(/^(['"])(.*)\1$/, '$2');

// Minimal reader for the compose files we ship (two-space indentation,
// map-style `environment:`), so the guard needs no YAML dependency.
const parseComposeServices = (content: string): ComposeService[] => {
  const services: ComposeService[] = [];
  let isInServices = false;
  let isInEnvironment = false;
  let currentService: ComposeService | undefined;

  for (const rawLine of content.split('\n')) {
    if (rawLine.trim() === '' || rawLine.trimStart().startsWith('#')) {
      continue;
    }

    const line = rawLine.replace(/\s+#\s.*$/, '');

    if (/^\S/.test(line)) {
      isInServices = line.startsWith('services:');
      currentService = undefined;
      continue;
    }

    if (!isInServices) {
      continue;
    }

    const serviceMatch = line.match(/^ {2}([\w-]+):\s*$/);

    if (serviceMatch !== null) {
      currentService = {
        name: serviceMatch[1],
        command: '',
        environment: {},
      };
      services.push(currentService);
      isInEnvironment = false;
      continue;
    }

    if (currentService === undefined) {
      continue;
    }

    const serviceKeyMatch = line.match(/^ {4}([\w-]+):\s*(.*)$/);

    if (serviceKeyMatch !== null) {
      isInEnvironment = serviceKeyMatch[1] === 'environment';

      if (serviceKeyMatch[1] === 'command') {
        currentService.command = serviceKeyMatch[2];
      }
      continue;
    }

    const environmentMatch = isInEnvironment
      ? line.match(/^ {6}([A-Z0-9_]+):\s*(.*)$/)
      : null;

    if (environmentMatch !== null) {
      currentService.environment[environmentMatch[1]] = unquote(
        environmentMatch[2].trim(),
      );
    }
  }

  return services;
};

const COMPOSE_MANIFESTS = [
  'packages/twenty-docker/docker-compose.yml',
  'packages/twenty-docker/docker-compose.coolify.yml',
  'docker-compose.coolify.yml',
  'packages/twenty-docker/podman/podman-compose.yml',
];

const readComposeServices = (relativePath: string): ComposeService[] =>
  parseComposeServices(
    readFileSync(join(repositoryRoot, relativePath), 'utf8'),
  );

describe('bundled app provisioning boot contract (entrypoint.sh)', () => {
  it('provisions after the upgrade, then installs, on the migrating server', () => {
    const { yarnCalls } = runEntrypoint({});

    expect(yarnCalls).toEqual([
      'command:prod cache:flush',
      UPGRADE,
      'command:prod cache:flush',
      PROVISION_BUNDLED,
      INSTALL_PRE_INSTALLED,
      'command:prod cron:register:all',
    ]);
  });

  it('treats the empty value rendered by a compose passthrough as enabled', () => {
    const { yarnCalls } = runEntrypoint({
      DISABLE_BUNDLED_APP_PROVISIONING: '',
    });

    expect(yarnCalls).toContain(PROVISION_BUNDLED);
    expect(yarnCalls).toContain(INSTALL_PRE_INSTALLED);
  });

  it('honours the explicit opt-out on the server without skipping the upgrade', () => {
    const { yarnCalls } = runEntrypoint({
      DISABLE_BUNDLED_APP_PROVISIONING: 'true',
    });

    expect(yarnCalls).toContain(UPGRADE);
    expect(yarnCalls).not.toContain(PROVISION_BUNDLED);
    expect(yarnCalls).not.toContain(INSTALL_PRE_INSTALLED);
  });

  it('runs nothing in a worker configured like the shipped compose files', () => {
    const { yarnCalls } = runEntrypoint({
      DISABLE_DB_MIGRATIONS: 'true',
      DISABLE_CRON_JOBS_REGISTRATION: 'true',
      DISABLE_BUNDLED_APP_PROVISIONING: 'true',
    });

    expect(yarnCalls).toEqual([]);
  });

  it('skips provisioning in a legacy worker that only disables migrations', () => {
    const { yarnCalls, output } = runEntrypoint({
      DISABLE_DB_MIGRATIONS: 'true',
      DISABLE_CRON_JOBS_REGISTRATION: 'true',
    });

    expect(yarnCalls).toEqual([]);
    expect(output).toContain(
      'Database migrations are disabled in this container, so bundled app provisioning is skipped too',
    );
  });

  it('still provisions when migrations run out-of-band and provisioning is forced', () => {
    const { yarnCalls } = runEntrypoint({
      DISABLE_DB_MIGRATIONS: 'true',
      DISABLE_CRON_JOBS_REGISTRATION: 'true',
      DISABLE_BUNDLED_APP_PROVISIONING: 'false',
    });

    expect(yarnCalls).toEqual([PROVISION_BUNDLED, INSTALL_PRE_INSTALLED]);
  });
});

describe('bundled app provisioning in shipped deployment manifests', () => {
  it.each(COMPOSE_MANIFESTS)(
    '%s disables bundled provisioning on every worker service',
    (relativePath) => {
      const workerServices = readComposeServices(relativePath).filter(
        (service) => service.command.includes('worker:prod'),
      );

      expect(workerServices.length).toBeGreaterThan(0);

      for (const workerService of workerServices) {
        expect({
          service: workerService.name,
          value: workerService.environment.DISABLE_BUNDLED_APP_PROVISIONING,
        }).toEqual({ service: workerService.name, value: 'true' });
      }
    },
  );

  it.each(COMPOSE_MANIFESTS)(
    '%s passes the operator opt-out through to the server',
    (relativePath) => {
      const serverService = readComposeServices(relativePath).find(
        (service) => service.name === 'server',
      );

      expect(serverService).toBeDefined();
      expect(
        serverService?.environment.DISABLE_BUNDLED_APP_PROVISIONING,
      ).toMatch(/^\$\{DISABLE_BUNDLED_APP_PROVISIONING(:-)?\}$/);
    },
  );

  it('disables bundled provisioning on the manual podman worker container', () => {
    const script = readFileSync(
      join(
        twentyDockerDirectory,
        'podman',
        'manual-steps-to-deploy-twenty-on-podman',
      ),
      'utf8',
    );
    const lines = script.split('\n');
    const workerStart = lines.findIndex((line) =>
      line.includes('--name twenty-worker'),
    );

    expect(workerStart).toBeGreaterThanOrEqual(0);

    const workerCommand: string[] = [];

    for (const line of lines.slice(workerStart)) {
      workerCommand.push(line);

      if (!line.trimEnd().endsWith('\\')) {
        break;
      }
    }

    expect(workerCommand.join('\n')).toContain(
      '-e DISABLE_BUNDLED_APP_PROVISIONING=true',
    );
  });
});
