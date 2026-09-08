// Verify: remove onboarding->application-install edge, re-enumerate cycles through TARGET
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve('packages/twenty-server/src');
const TARGET = join(
  ROOT,
  'engine/api/graphql/workspace-query-runner/workspace-query-hook/workspace-query-hook.module.ts',
);
const ONBOARDING = join(
  ROOT,
  'engine/core-modules/onboarding/onboarding.module.ts',
);
const APP_INSTALL = join(
  ROOT,
  'engine/core-modules/application/application-install/application-install.module.ts',
);

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

// Simulate the fix: drop the edge
graph.set(
  ONBOARDING,
  (graph.get(ONBOARDING) ?? []).filter((dep) => dep !== APP_INSTALL),
);

// canReachTarget via reverse BFS
const reverseGraph = new Map(files.map((f) => [f, []]));
for (const [from, deps] of graph) {
  for (const dep of deps) reverseGraph.get(dep)?.push(from);
}
const canReachTarget = new Set([TARGET]);
{
  const stack = [TARGET];
  while (stack.length > 0) {
    const node = stack.pop();
    for (const prev of reverseGraph.get(node) ?? []) {
      if (!canReachTarget.has(prev)) {
        canReachTarget.add(prev);
        stack.push(prev);
      }
    }
  }
}

const cycles = [];
const onPath = new Set([TARGET]);
function dfs(node, path) {
  for (const next of graph.get(node) ?? []) {
    if (!canReachTarget.has(next)) continue;
    if (next === TARGET) {
      cycles.push([...path]);
      return;
    }
    if (onPath.has(next)) continue;
    onPath.add(next);
    path.push(next);
    dfs(next, path);
    path.pop();
    onPath.delete(next);
    if (cycles.length >= 5) return;
  }
}
dfs(TARGET, [TARGET]);

const short = (p) => p.replace(ROOT + '/', '');
console.log(
  `After removing onboarding→application-install: ${cycles.length === 0 ? 'ZERO cycles through TARGET ✅' : cycles.length + '+ cycles REMAIN:'}`,
);
for (const cycle of cycles.slice(0, 5)) {
  console.log('  ' + [TARGET, ...cycle].map(short).join('\n  → '));
  console.log('');
}
