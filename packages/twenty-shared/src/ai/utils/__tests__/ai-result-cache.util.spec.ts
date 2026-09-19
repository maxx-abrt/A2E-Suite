import {
  type AiResultCacheDescriptor,
  type AiResultCacheEntry,
  type AiResultVersions,
} from '@/ai/types/ai-result-cache.type';
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
} from '@/ai/utils/ai-result-cache.util';

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

describe('ai-result-cache', () => {
  it('resolves the same payload in two workspaces to different private keys', () => {
    const workspaceA = makeDescriptor({
      scope: { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
    });
    const workspaceB = makeDescriptor({
      scope: { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_OWNER },
    });

    expect(resolveAiResultCacheKey(workspaceA).cacheKey).not.toBe(
      resolveAiResultCacheKey(workspaceB).cacheKey,
    );
    expect(resolveAiResultCacheKey(workspaceA).isGlobal).toBe(false);
  });

  it('never lets a private entry satisfy another workspace (no cross-workspace leak)', () => {
    const entry = makeEntry(makeDescriptor());
    const request = makeDescriptor({
      scope: { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_OWNER },
    });

    expect(evaluateAiResultReuse({ entry, request, now: NOW })).toEqual({
      reusable: false,
      reason: 'ACCESS_CHANGED',
    });
  });

  it('invalidates a private entry when the role or permissions change', () => {
    const entry = makeEntry(makeDescriptor());
    const roleChanged = makeDescriptor({
      scope: { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_EDITOR },
    });

    expect(resolveAiResultCacheKey(makeDescriptor()).cacheKey).not.toBe(
      resolveAiResultCacheKey(roleChanged).cacheKey,
    );
    expect(
      evaluateAiResultReuse({ entry, request: roleChanged, now: NOW }),
    ).toEqual({ reusable: false, reason: 'ACCESS_CHANGED' });
  });

  it('builds a deterministic access scope id that reacts to role and permission changes', () => {
    expect(
      buildAccessScopeId({
        roleUniversalIdentifier: 'role-a',
        permissionFingerprint: 'grants-a',
      }),
    ).toBe(
      buildAccessScopeId({
        roleUniversalIdentifier: 'role-a',
        permissionFingerprint: 'grants-a',
      }),
    );
    expect(buildAccessScopeId({ roleUniversalIdentifier: 'role-a' })).not.toBe(
      buildAccessScopeId({ roleUniversalIdentifier: 'role-b' }),
    );
    expect(buildAccessScopeId({ permissionFingerprint: 'grants-a' })).not.toBe(
      buildAccessScopeId({ permissionFingerprint: 'grants-b' }),
    );
    expect(buildAccessScopeId({})).toBe('role:none|perms:none');
  });

  it('shares a reviewed public catalogue result globally across workspaces', () => {
    const workspaceA = makeReviewedPublic({
      scope: { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
    });
    const workspaceB = makeReviewedPublic({
      scope: { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_EDITOR },
    });

    expect(isGloballyShareable(workspaceA)).toBe(true);
    expect(resolveAiResultCacheKey(workspaceA).isGlobal).toBe(true);
    expect(resolveAiResultCacheKey(workspaceA).cacheKey).toBe(
      resolveAiResultCacheKey(workspaceB).cacheKey,
    );
    expect(
      evaluateAiResultReuse({
        entry: makeEntry(workspaceA),
        request: workspaceB,
        now: NOW,
      }),
    ).toEqual({ reusable: true, reason: 'FRESH' });
  });

  it('keeps an unreviewed public catalogue result scoped and never serves it globally', () => {
    const unreviewed = makeDescriptor({
      visibility: 'PUBLIC_CATALOGUE',
      reviewedForGlobalSharing: false,
    });
    const unreviewedOtherWorkspace = makeDescriptor({
      visibility: 'PUBLIC_CATALOGUE',
      reviewedForGlobalSharing: false,
      scope: { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_OWNER },
    });

    expect(isGloballyShareable(unreviewed)).toBe(false);
    expect(resolveAiResultCacheKey(unreviewed).isGlobal).toBe(false);
    expect(resolveAiResultCacheKey(unreviewed).cacheKey).not.toBe(
      resolveAiResultCacheKey(unreviewedOtherWorkspace).cacheKey,
    );
    expect(
      evaluateAiResultReuse({
        entry: makeEntry(makeReviewedPublic()),
        request: unreviewed,
        now: NOW,
      }),
    ).toEqual({ reusable: false, reason: 'NOT_REVIEWED' });
  });

  it('invalidates the entry when a model, data or catalogue version changes', () => {
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

    expect(
      hasAiResultVersionDrift(entry.versions, catalogBumped.versions),
    ).toBe(true);
    expect(entry.cacheKey).not.toBe(
      resolveAiResultCacheKey(catalogBumped).cacheKey,
    );
    expect(
      evaluateAiResultReuse({ entry, request: catalogBumped, now: NOW }),
    ).toEqual({ reusable: false, reason: 'VERSION_MISMATCH' });
    expect(
      evaluateAiResultReuse({ entry, request: modelBumped, now: NOW }),
    ).toEqual({ reusable: false, reason: 'VERSION_MISMATCH' });
    expect(
      evaluateAiResultReuse({ entry, request: dataBumped, now: NOW }),
    ).toEqual({ reusable: false, reason: 'VERSION_MISMATCH' });
  });

  it('reuses a fresh entry and refuses a visibility mismatch', () => {
    const descriptor = makeDescriptor();

    expect(
      evaluateAiResultReuse({
        entry: makeEntry(descriptor),
        request: descriptor,
        now: NOW,
      }),
    ).toEqual({ reusable: true, reason: 'FRESH' });
    expect(
      evaluateAiResultReuse({
        entry: makeEntry(makeDescriptor({ visibility: 'PUBLIC_CATALOGUE' })),
        request: makeReviewedPublic(),
        now: NOW,
      }),
    ).toEqual({ reusable: false, reason: 'KEY_MISMATCH' });
  });

  it('never reuses a forged cache key', () => {
    const descriptor = makeDescriptor();
    const entry = makeEntry(descriptor, { cacheKey: 'scoped|tampered' });

    expect(
      evaluateAiResultReuse({ entry, request: descriptor, now: NOW }),
    ).toEqual({ reusable: false, reason: 'KEY_MISMATCH' });
  });

  it('honors expiry, never expires a null expiry and fails closed on malformed dates', () => {
    const descriptor = makeDescriptor();

    expect(
      evaluateAiResultReuse({
        entry: makeEntry(descriptor, { expiresAt: PAST }),
        request: descriptor,
        now: NOW,
      }),
    ).toEqual({ reusable: false, reason: 'EXPIRED' });
    expect(
      evaluateAiResultReuse({
        entry: makeEntry(descriptor, { expiresAt: FUTURE }),
        request: descriptor,
        now: NOW,
      }),
    ).toEqual({ reusable: true, reason: 'FRESH' });
    expect(
      evaluateAiResultReuse({
        entry: makeEntry(descriptor, { expiresAt: null }),
        request: descriptor,
        now: NOW,
      }),
    ).toEqual({ reusable: true, reason: 'FRESH' });

    expect(isAiResultExpired({ expiresAt: NOW, now: NOW })).toBe(true);
    expect(isAiResultExpired({ expiresAt: undefined, now: NOW })).toBe(false);
    expect(isAiResultExpired({ expiresAt: 'not-a-date', now: NOW })).toBe(true);
    expect(isAiResultExpired({ expiresAt: NOW, now: 'not-a-date' })).toBe(true);
  });

  it('computes per-visibility expiry with an optional override', () => {
    const generatedAt = '2026-01-01T00:00:00.000Z';
    const base = Date.parse(generatedAt);

    expect(
      computeAiResultExpiresAt({ generatedAt, visibility: 'PRIVATE' }),
    ).toBe(new Date(base + PRIVATE_AI_RESULT_TTL_MS).toISOString());
    expect(
      computeAiResultExpiresAt({ generatedAt, visibility: 'PUBLIC_CATALOGUE' }),
    ).toBe(new Date(base + PUBLIC_CATALOGUE_AI_RESULT_TTL_MS).toISOString());
    expect(
      computeAiResultExpiresAt({
        generatedAt,
        visibility: 'PRIVATE',
        ttlMs: 1000,
      }),
    ).toBe(new Date(base + 1000).toISOString());
    expect(() =>
      computeAiResultExpiresAt({ generatedAt: 'nope', visibility: 'PRIVATE' }),
    ).toThrow(/Invalid generatedAt/);
  });

  it('detects scope drift only inside the same workspace and access scope', () => {
    expect(
      hasAiResultScopeDrift(
        { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
        { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
      ),
    ).toBe(false);
    expect(
      hasAiResultScopeDrift(
        { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
        { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_OWNER },
      ),
    ).toBe(true);
  });
});
