// Check whether application-install.service.ts transitively requires any
// module file that participates in the query-hook cycle (deleted after use)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve('packages/twenty-server/src');

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full);
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.d.ts')
    ) {
      files.push(full);
    }
  }
})(ROOT);

function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith('src/')) base = join(ROOT, spec.slice(4));
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else return null;
  for (const candidate of [base + '.ts', join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const graph = new Map();
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const deps = new Set();
  for (const match of source.matchAll(/from\s+'([^']+)'/g)) {
    const dep = resolveImport(file, match[1]);
    if (dep) deps.add(dep);
  }
  for (const match of source.matchAll(/import\('([^']+)'\)/g)) {
    const dep = resolveImport(file, match[1]);
    if (dep) deps.add(dep);
  }
  graph.set(file, [...deps]);
}

function computeReachable(start) {
  const seen = new Set();
  const stack = [start];
  while (stack.length > 0) {
    const node = stack.pop();
    for (const next of graph.get(node) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

const TARGET = join(
  ROOT,
  'engine/api/graphql/workspace-query-runner/workspace-query-hook/workspace-query-hook.module.ts',
);
const targetReaches = computeReachable(TARGET);

// Files reachable from the service files WorkspaceTemplateService will keep importing
const seeds = [
  'engine/core-modules/application/application-install/application-install.service.ts',
  'engine/core-modules/application/application-registration/application-registration.service.ts',
  'engine/core-modules/application/application.service.ts',
  'engine/workspace-cache/services/workspace-cache.service.ts',
  'engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service.ts',
].map((rel) => join(ROOT, rel));

const short = (p) => p.replace(ROOT + '/', '');
for (const seed of seeds) {
  if (!existsSync(seed)) {
    console.log('MISSING SEED: ' + short(seed));
    continue;
  }
  const reachable = computeReachable(seed);
  const offenders = [...reachable].filter(
    (file) => targetReaches.has(file) || file === TARGET,
  );
  console.log(
    `${short(seed)}: ${offenders.length === 0 ? 'CLEAN (no cycle-closer reachable)' : 'REACHES ' + offenders.length + ' cycle nodes:'}`,
  );
  for (const offender of offenders.slice(0, 10))
    console.log('    ' + short(offender));
}
