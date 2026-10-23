import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  BUNDLED_APPLICATION_NAMES,
  buildBundledApplications,
} from '../build-bundled-apps.mjs';

const temporaryDirectories = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

const prepareApplications = ({ withShared = true } = {}) => {
  const directory = mkdtempSync(join(tmpdir(), 'a2e-bundled-build-'));
  temporaryDirectories.push(directory);
  if (withShared) {
    const sharedDirectory = join(directory, 'node_modules', 'twenty-shared');
    mkdirSync(sharedDirectory, { recursive: true });
    writeFileSync(
      join(sharedDirectory, 'package.json'),
      JSON.stringify({
        name: 'twenty-shared',
        exports: { './application': './application.cjs' },
      }),
    );
    writeFileSync(
      join(sharedDirectory, 'application.cjs'),
      'module.exports = {};',
    );
  }
  for (const name of BUNDLED_APPLICATION_NAMES) {
    mkdirSync(join(directory, name), { recursive: true });
    writeFileSync(
      join(directory, name, 'package.json'),
      JSON.stringify({ name, version: '1.0.0' }),
    );
  }
  return directory;
};

const writeBuild = (directory, { manifest = true, version = '1.0.0' } = {}) => {
  const name = basename(directory);
  const output = join(directory, '.twenty', 'output');
  mkdirSync(join(output, 'package'), { recursive: true });
  writeFileSync(
    join(output, 'package.json'),
    JSON.stringify({ name, version }),
  );
  writeFileSync(
    join(output, 'package', manifest ? 'manifest.json' : 'other.json'),
    JSON.stringify({ application: { universalIdentifier: `test-${name}` } }),
  );
  execFileSync('tar', [
    '-czf',
    join(output, `${name}-${version}.tgz`),
    '-C',
    output,
    'package',
  ]);
};

test('builds, verifies and collects every bundled app from its exact source version', () => {
  const rootDirectory = prepareApplications();
  const calls = [];
  const archives = buildBundledApplications({
    rootDirectory,
    runCommand: (command, arguments_, { cwd }) => {
      calls.push({ command, arguments_, name: basename(cwd) });
      if (arguments_[0] === 'twenty') writeBuild(cwd);
    },
  });
  assert.equal(archives.length, 7);
  assert.ok(archives.every(existsSync));
  assert.equal(calls.length, 14);
  assert.deepEqual(calls[0].arguments_, ['install', '--immutable']);
  assert.deepEqual(calls[1].arguments_, ['twenty', 'dev:build', '--tarball']);
});

test('stops at an earlier app failure even when later apps could succeed', () => {
  const rootDirectory = prepareApplications();
  const attempted = [];
  assert.throws(
    () =>
      buildBundledApplications({
        rootDirectory,
        runCommand: (_command, arguments_, { cwd }) => {
          if (arguments_[0] !== 'twenty') return;
          attempted.push(basename(cwd));
          if (basename(cwd) === 'a2e-accounting')
            throw new Error('compiler failed');
          writeBuild(cwd);
        },
      }),
    /Bundled application a2e-accounting failed: compiler failed/,
  );
  assert.deepEqual(attempted, ['a2e-documents', 'a2e-accounting']);
});

test('does not accept an old output version', () => {
  const rootDirectory = prepareApplications();
  assert.throws(
    () =>
      buildBundledApplications({
        rootDirectory,
        runCommand: (_command, arguments_, { cwd }) => {
          if (arguments_[0] === 'twenty') writeBuild(cwd, { version: '0.9.0' });
        },
      }),
    /identity\/version differs/,
  );
});

test('rejects an archive missing the native application manifest', () => {
  const rootDirectory = prepareApplications();
  assert.throws(
    () =>
      buildBundledApplications({
        rootDirectory,
        runCommand: (_command, arguments_, { cwd }) => {
          if (arguments_[0] === 'twenty') writeBuild(cwd, { manifest: false });
        },
      }),
    /Archive has no package\/manifest.json/,
  );
});

test('does not pretend an archive was produced when the CLI returns without one', () => {
  const rootDirectory = prepareApplications();
  assert.throws(
    () => buildBundledApplications({ rootDirectory, runCommand: () => {} }),
    /Bundled application a2e-documents failed/,
  );
  assert.equal(
    readFileSync(
      join(rootDirectory, 'a2e-documents', 'package.json'),
      'utf8',
    ).includes('1.0.0'),
    true,
  );
});

test('rejects an isolated app tree without the native shared module before running builds', () => {
  const rootDirectory = prepareApplications({ withShared: false });
  let called = false;
  assert.throws(
    () =>
      buildBundledApplications({
        rootDirectory,
        runCommand: () => {
          called = true;
        },
      }),
    /Native twenty-shared\/application is unavailable/,
  );
  assert.equal(called, false);
});
