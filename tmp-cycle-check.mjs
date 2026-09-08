// Exhaustive simple-cycle enumeration through TARGET (deleted after use).
// DFS restricted to nodes that can reach TARGET; prints every distinct cycle.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve('packages/twenty-server/src');
const TARGET = join(
  ROOT,
  'engine/api/graphql/workspace-query-runner/workspace-query-hook/workspace-query-hook.module.ts',
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
const reverseGraph = new Map();
for (const file of files) {
  graph.set(file, []);
  reverseGraph.set(file, []);
}
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
  for (const dep of deps) reverseGraph.get(dep)?.push(file);
}

const short = (p) => p.replace(ROOT + '/', '');

// Nodes that can reach TARGET (reverse BFS from TARGET)
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

// Enumerate all simple cycles through TARGET (DFS over canReachTarget nodes)
const cycles = [];
const onPath = new Set([TARGET]);
function dfs(node, path) {
  for (const next of graph.get(node) ?? []) {
    if (!canReachTarget.has(next)) continue;
    if (next === TARGET) {
      cycles.push([...path]);
      if (cycles.length >= 200) throw new Error('cap');
      continue;
    }
    if (onPath.has(next)) continue;
    onPath.add(next);
    path.push(next);
    dfs(next, path);
    path.pop();
    onPath.delete(next);
  }
}
try {
  dfs(TARGET, [TARGET]);
} catch {
  console.log('(hit 200-cycle cap, results truncated)');
}

console.log(`Total simple cycles through TARGET: ${cycles.length}\n`);

// Edge frequency: which edges appear in how many cycles
const edgeCount = new Map();
for (const cycle of cycles) {
  const nodes = [TARGET, ...cycle];
  for (let i = 0; i < nodes.length; i += 1) {
    const from = nodes[i];
    const to = nodes[(i + 1) % nodes.length];
    const key = `${short(from)} -> ${short(to)}`;
    edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
  }
}
console.log(
  'Edges by cycle participation (all cycles pass through each listed edge count > 0; = total means universal):',
);
for (const [edge, count] of [...edgeCount.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 40)) {
  console.log(`  ${String(count).padStart(3)}  ${edge}`);
}

console.log('\nSample cycles (up to 10):');
for (const cycle of cycles.slice(0, 10)) {
  console.log('  ' + [TARGET, ...cycle].map(short).join('\n  → '));
  console.log('');
}
