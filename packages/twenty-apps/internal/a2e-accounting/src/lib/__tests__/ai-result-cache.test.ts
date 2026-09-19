import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildAccessScopeId,
  computeAiResultExpiresAt,
  evaluateAiResultReuse,
  hasAiResultScopeDrift,
  hasAiResultVersionDrift,
  isAiResultExpired,
  isGloballyShareable,
  PRIVATE_AI_RESULT_TTL_MS,
  PUBLIC_CATALOGUE_AI_RESULT_TTL_MS,
  resolveAiResultCacheKey,
  type AiResultCacheDescriptor,
  type AiResultCacheEntry,
  type AiResultVersions,
} from '../ai-result-cache.ts';

const WORKSPACE_A = 'ws-a';
const WORKSPACE_B = 'ws-b';
const ACCESS_OWNER = buildAccessScopeId({
  roleUniversalIdentifier: 'role-owner',
  permissionFingerprint: 'grants-1',
});
const ACCESS_EDITOR = buildAccessScopeId({
  roleUniversalIdentifier: 'role-editor',
  permissionFingerprint: 'grants-2',
});

const NOW = '2026-06-01T12:00:00.000Z';
const FUTURE = '2026-06-08T12:00:00.000Z';
const PAST = '2026-05-25T12:00:00.000Z';

const VERSIONS: AiResultVersions = {
  modelVersion: 'bilan-rules@1',
  dataVersion: 'data-1',
  catalogVersion: 7,
};

const makeDescriptor = (
  overrides: Partial<AiResultCacheDescriptor> = {},
): AiResultCacheDescriptor => ({
  kind: 'EXPENSE_CATEGORIZATION',
  visibility: 'PRIVATE',
  payloadHash: 'payload-hash',
  scope: { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
  versions: { ...VERSIONS },
  ...overrides,
});

const makeReviewedPublic = (
  overrides: Partial<AiResultCacheDescriptor> = {},
): AiResultCacheDescriptor =>
  makeDescriptor({
    visibility: 'PUBLIC_CATALOGUE',
    reviewedForGlobalSharing: true,
    ...overrides,
  });

const makeEntry = (
  descriptor: AiResultCacheDescriptor,
  overrides: Partial<AiResultCacheEntry> = {},
): AiResultCacheEntry => ({
  cacheKey: resolveAiResultCacheKey(descriptor).cacheKey,
  visibility: descriptor.visibility,
  scope: descriptor.scope,
  versions: descriptor.versions,
  ...overrides,
});

test('the same payload in two workspaces resolves to different private keys', () => {
  const workspaceA = makeDescriptor({
    scope: { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
  });
  const workspaceB = makeDescriptor({
    scope: { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_OWNER },
  });

  assert.notEqual(
    resolveAiResultCacheKey(workspaceA).cacheKey,
    resolveAiResultCacheKey(workspaceB).cacheKey,
  );
  assert.equal(resolveAiResultCacheKey(workspaceA).isGlobal, false);
});

test('a private entry never satisfies another workspace (no cross-workspace leak)', () => {
  const entry = makeEntry(makeDescriptor());
  const request = makeDescriptor({
    scope: { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_OWNER },
  });

  assert.deepEqual(evaluateAiResultReuse({ entry, request, now: NOW }), {
    reusable: false,
    reason: 'ACCESS_CHANGED',
  });
});

test('a role or permission change invalidates a private entry', () => {
  const entry = makeEntry(makeDescriptor());
  const roleChanged = makeDescriptor({
    scope: { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_EDITOR },
  });

  assert.notEqual(
    resolveAiResultCacheKey(makeDescriptor()).cacheKey,
    resolveAiResultCacheKey(roleChanged).cacheKey,
  );
  assert.deepEqual(evaluateAiResultReuse({ entry, request: roleChanged, now: NOW }), {
    reusable: false,
    reason: 'ACCESS_CHANGED',
  });
});

test('buildAccessScopeId is deterministic and reacts to role and permission changes', () => {
  assert.equal(
    buildAccessScopeId({
      roleUniversalIdentifier: 'role-a',
      permissionFingerprint: 'grants-a',
    }),
    buildAccessScopeId({
      roleUniversalIdentifier: 'role-a',
      permissionFingerprint: 'grants-a',
    }),
  );
  assert.notEqual(
    buildAccessScopeId({ roleUniversalIdentifier: 'role-a' }),
    buildAccessScopeId({ roleUniversalIdentifier: 'role-b' }),
  );
  assert.notEqual(
    buildAccessScopeId({ permissionFingerprint: 'grants-a' }),
    buildAccessScopeId({ permissionFingerprint: 'grants-b' }),
  );
  assert.equal(buildAccessScopeId({}), 'role:none|perms:none');
});

test('a reviewed public catalogue result is shared globally across workspaces', () => {
  const workspaceA = makeReviewedPublic({
    scope: { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
  });
  const workspaceB = makeReviewedPublic({
    scope: { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_EDITOR },
  });

  assert.equal(isGloballyShareable(workspaceA), true);
  assert.equal(resolveAiResultCacheKey(workspaceA).isGlobal, true);
  assert.equal(
    resolveAiResultCacheKey(workspaceA).cacheKey,
    resolveAiResultCacheKey(workspaceB).cacheKey,
  );
  assert.deepEqual(
    evaluateAiResultReuse({
      entry: makeEntry(workspaceA),
      request: workspaceB,
      now: NOW,
    }),
    { reusable: true, reason: 'FRESH' },
  );
});

test('an unreviewed public catalogue result stays scoped and is never served globally', () => {
  const unreviewed = makeDescriptor({
    visibility: 'PUBLIC_CATALOGUE',
    reviewedForGlobalSharing: false,
  });
  const unreviewedOtherWorkspace = makeDescriptor({
    visibility: 'PUBLIC_CATALOGUE',
    reviewedForGlobalSharing: false,
    scope: { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_OWNER },
  });

  assert.equal(isGloballyShareable(unreviewed), false);
  assert.equal(resolveAiResultCacheKey(unreviewed).isGlobal, false);
  assert.notEqual(
    resolveAiResultCacheKey(unreviewed).cacheKey,
    resolveAiResultCacheKey(unreviewedOtherWorkspace).cacheKey,
  );
  assert.deepEqual(
    evaluateAiResultReuse({
      entry: makeEntry(makeReviewedPublic()),
      request: unreviewed,
      now: NOW,
    }),
    { reusable: false, reason: 'NOT_REVIEWED' },
  );
});

test('a model, data or catalogue version bump invalidates the entry', () => {
  const entry = makeEntry(makeDescriptor());

  const catalogBumped = makeDescriptor({
    versions: { ...VERSIONS, catalogVersion: VERSIONS.catalogVersion + 1 },
  });
  const modelBumped = makeDescriptor({
    versions: { ...VERSIONS, modelVersion: 'bilan-rules@2' },
  });
  const dataBumped = makeDescriptor({
    versions: { ...VERSIONS, dataVersion: 'data-2' },
  });

  assert.equal(
    hasAiResultVersionDrift(entry.versions, catalogBumped.versions),
    true,
  );
  assert.notEqual(
    entry.cacheKey,
    resolveAiResultCacheKey(catalogBumped).cacheKey,
  );
  assert.deepEqual(
    evaluateAiResultReuse({ entry, request: catalogBumped, now: NOW }),
    { reusable: false, reason: 'VERSION_MISMATCH' },
  );
  assert.deepEqual(
    evaluateAiResultReuse({ entry, request: modelBumped, now: NOW }),
    { reusable: false, reason: 'VERSION_MISMATCH' },
  );
  assert.deepEqual(
    evaluateAiResultReuse({ entry, request: dataBumped, now: NOW }),
    { reusable: false, reason: 'VERSION_MISMATCH' },
  );
});

test('a fresh entry is reused and a visibility mismatch is refused', () => {
  const descriptor = makeDescriptor();

  assert.deepEqual(
    evaluateAiResultReuse({
      entry: makeEntry(descriptor),
      request: descriptor,
      now: NOW,
    }),
    { reusable: true, reason: 'FRESH' },
  );
  assert.deepEqual(
    evaluateAiResultReuse({
      entry: makeEntry(makeDescriptor({ visibility: 'PUBLIC_CATALOGUE' })),
      request: makeReviewedPublic(),
      now: NOW,
    }),
    { reusable: false, reason: 'KEY_MISMATCH' },
  );
});

test('a forged cache key can never be reused', () => {
  const descriptor = makeDescriptor();
  const entry = makeEntry(descriptor, { cacheKey: 'scoped|tampered' });

  assert.deepEqual(evaluateAiResultReuse({ entry, request: descriptor, now: NOW }), {
    reusable: false,
    reason: 'KEY_MISMATCH',
  });
});

test('expiry is honored, null expiry never expires and malformed expiry fails closed', () => {
  const descriptor = makeDescriptor();

  assert.deepEqual(
    evaluateAiResultReuse({
      entry: makeEntry(descriptor, { expiresAt: PAST }),
      request: descriptor,
      now: NOW,
    }),
    { reusable: false, reason: 'EXPIRED' },
  );
  assert.deepEqual(
    evaluateAiResultReuse({
      entry: makeEntry(descriptor, { expiresAt: FUTURE }),
      request: descriptor,
      now: NOW,
    }),
    { reusable: true, reason: 'FRESH' },
  );
  assert.deepEqual(
    evaluateAiResultReuse({
      entry: makeEntry(descriptor, { expiresAt: null }),
      request: descriptor,
      now: NOW,
    }),
    { reusable: true, reason: 'FRESH' },
  );

  assert.equal(isAiResultExpired({ expiresAt: NOW, now: NOW }), true);
  assert.equal(isAiResultExpired({ expiresAt: undefined, now: NOW }), false);
  assert.equal(isAiResultExpired({ expiresAt: 'not-a-date', now: NOW }), true);
  assert.equal(isAiResultExpired({ expiresAt: NOW, now: 'not-a-date' }), true);
});

test('computeAiResultExpiresAt applies per-visibility TTLs and accepts an override', () => {
  const generatedAt = '2026-01-01T00:00:00.000Z';
  const base = Date.parse(generatedAt);

  assert.equal(
    computeAiResultExpiresAt({ generatedAt, visibility: 'PRIVATE' }),
    new Date(base + PRIVATE_AI_RESULT_TTL_MS).toISOString(),
  );
  assert.equal(
    computeAiResultExpiresAt({ generatedAt, visibility: 'PUBLIC_CATALOGUE' }),
    new Date(base + PUBLIC_CATALOGUE_AI_RESULT_TTL_MS).toISOString(),
  );
  assert.equal(
    computeAiResultExpiresAt({
      generatedAt,
      visibility: 'PRIVATE',
      ttlMs: 1000,
    }),
    new Date(base + 1000).toISOString(),
  );
  assert.throws(
    () =>
      computeAiResultExpiresAt({ generatedAt: 'nope', visibility: 'PRIVATE' }),
    /Invalid generatedAt/,
  );
});

test('scope drift is only detected inside the same workspace and access scope', () => {
  assert.equal(
    hasAiResultScopeDrift(
      { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
      { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
    ),
    false,
  );
  assert.equal(
    hasAiResultScopeDrift(
      { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
      { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_OWNER },
    ),
    true,
  );
});
