// Tarjan SCC over the full import graph with the fix applied.
// Prints remaining strongly-connected components that contain Nest module files.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve('packages/twenty-server/src');
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

// Apply the planned fix
graph.set(
  ONBOARDING,
  (graph.get(ONBOARDING) ?? []).filter((dep) => dep !== APP_INSTALL),
);

// Tarjan
const index = new Map();
const low = new Map();
const onStack = new Set();
const stack = [];
let counter = 0;
const sccs = [];

function strongconnect(v) {
  index.set(v, counter);
  low.set(v, counter);
  counter += 1;
  stack.push(v);
  onStack.add(v);
  for (const w of graph.get(v) ?? []) {
    if (!index.has(w)) {
      strongconnect(w);
      low.set(v, Math.min(low.get(v), low.get(w)));
    } else if (onStack.has(w)) {
      low.set(v, Math.min(low.get(v), index.get(w)));
    }
  }
  if (low.get(v) === index.get(v)) {
    const component = [];
    let w;
    do {
      w = stack.pop();
      onStack.delete(w);
      component.push(w);
    } while (w !== v);
    sccs.push(component);
  }
}

for (const file of files) {
  if (!index.has(file)) strongconnect(file);
}

const short = (p) => p.replace(ROOT + '/', '');
const moduleSccs = sccs.filter(
  (c) => c.length > 1 && c.some((f) => f.endsWith('.module.ts')),
);
if (moduleSccs.length === 0) {
  console.log(
    'NO strongly-connected components containing Nest modules remain ✅',
  );
} else {
  console.log(`${moduleSccs.length} SCC(s) still contain module files:`);
  for (const scc of moduleSccs.slice(0, 20)) {
    console.log('  SCC (' + scc.length + ' files):');
    for (const file of scc) console.log('    ' + short(file));
    console.log('');
  }
}
