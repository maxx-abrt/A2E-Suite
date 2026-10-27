import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const DOCKERFILE = readFileSync(
  join(REPOSITORY_ROOT, 'packages/twenty-docker/twenty/Dockerfile'),
  'utf8',
);

// Build stages that compile TypeScript sources inside the image. Every
// relative import found in the sources they COPY must resolve inside that
// same set of copied roots, otherwise the image build fails even though the
// full-checkout CI builds stay green (see the public-site website-tokens
// regression this guard was written for).
const BUILD_STAGES = ['twenty-server-build', 'twenty-front-build'];

const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  '.nx',
  'coverage',
  'storybook-static',
]);

const RELATIVE_IMPORT_PATTERN =
  /(?:from\s*|import\s*\(\s*|require\s*\(\s*)(['"])(\.[^'"]*)\1/g;

const extractStage = (stageName) => {
  const stageStart = DOCKERFILE.indexOf(`AS ${stageName}\n`);
  assert.ok(
    stageStart !== -1,
    `Dockerfile stage ${stageName} no longer exists; update this test`,
  );
  const stage = DOCKERFILE.slice(stageStart);
  const nextStage = stage.indexOf('\nFROM ');
  return stage.slice(0, nextStage === -1 ? undefined : nextStage);
};

// Directory sources copied by the stage (single files and flags are dropped;
// they carry no importable TypeScript tree).
const collectStageSourceRoots = (stageName) => {
  const roots = [];
  for (const line of extractStage(stageName).split('\n')) {
    if (!line.startsWith('COPY ')) continue;
    const sources = line
      .trim()
      .split(/\s+/)
      .slice(1, -1)
      .filter((token) => !token.startsWith('--'));
    assert.ok(
      sources.length === 1,
      `Unexpected multi-source COPY in stage ${stageName}: ${line}`,
    );
    const repositoryPath = join(REPOSITORY_ROOT, sources[0]);
    if (existsSync(repositoryPath) && statSync(repositoryPath).isDirectory())
      roots.push(repositoryPath);
  }
  assert.ok(roots.length > 0, `No directory sources copied by ${stageName}`);
  return roots;
};

const collectEscapingImports = (roots) => {
  const escapes = [];
  const isCovered = (target) =>
    roots.some((root) => target === root || target.startsWith(root + sep));

  const scanFile = (file) => {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(RELATIVE_IMPORT_PATTERN)) {
      // Vite query suffixes (?raw, ?url) are not part of the resolved path.
      const target = resolve(dirname(file), match[2].split('?')[0]);
      if (!isCovered(target))
        escapes.push(
          `${relative(REPOSITORY_ROOT, file)} imports '${match[2]}' which is not copied into the image`,
        );
    }
  };

  const scanDirectory = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) scanDirectory(entryPath);
      else if (/\.(ts|tsx)$/.test(entry.name)) scanFile(entryPath);
    }
  };

  roots.forEach(scanDirectory);
  return escapes;
};

for (const stageName of BUILD_STAGES) {
  test(`Docker stage ${stageName} copies every target of its relative imports`, () => {
    const escapes = collectEscapingImports(collectStageSourceRoots(stageName));
    assert.deepEqual(
      escapes,
      [],
      `Relative imports escape the sources copied by Docker stage ${stageName}; ` +
        `add a matching COPY line in packages/twenty-docker/twenty/Dockerfile or ` +
        `import through an already-copied package: ${escapes.join('; ')}`,
    );
  });
}
