import {
  type AiResultCacheDescriptor,
  type AiResultVersions,
} from '@/ai/types/ai-result-cache.type';
import {
  createAiSavedRun,
  estimateAiSavedRunRerun,
  executeAiSavedRunRerun,
  reopenAiSavedRun,
} from '@/ai/utils/ai-saved-run.util';
import { buildAccessScopeId } from '@/ai/utils/ai-result-cache.util';

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

const makeSavedRun = (
  descriptor: AiResultCacheDescriptor = makeDescriptor(),
  overrides: Partial<Parameters<typeof createAiSavedRun>[0]> = {},
) =>
  createAiSavedRun({
    runId: 'run-1',
    descriptor,
    generatedAt: NOW,
    ...overrides,
  });

describe('ai-saved-run', () => {
  it('persists an authorized result under the cache contract key and visibility expiry', () => {
    const savedRun = makeSavedRun();

    expect(savedRun.cacheKey).toContain('scoped|workspace:ws-a');
    expect(savedRun.cacheKey).toContain('access:' + ACCESS_OWNER);
    expect(savedRun.descriptor.visibility).toBe('PRIVATE');
    expect(savedRun.createdAt).toBe(NOW);
    expect(Date.parse(savedRun.expiresAt ?? '')).toBe(
      Date.parse(NOW) + 7 * 24 * 60 * 60 * 1000,
    );
    expect(() =>
      createAiSavedRun({
        runId: 'run-bad',
        descriptor: makeDescriptor(),
        generatedAt: 'not-a-date',
      }),
    ).toThrow(/Invalid generatedAt/);
  });

  it('re-opens a fresh private run with zero provider calls and zero quota billing', () => {
    const savedRun = makeSavedRun();

    expect(
      reopenAiSavedRun({
        savedRun,
        request: makeDescriptor(),
        now: NOW,
      }),
    ).toEqual({
      resolved: true,
      reason: 'FRESH',
      providerCallRequired: false,
      billableProviderCalls: 0,
    });
  });

  it('never resolves a saved run carried over from another workspace', () => {
    const savedRun = makeSavedRun();
    const otherWorkspace = makeDescriptor({
      scope: { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_OWNER },
    });

    expect(
      reopenAiSavedRun({ savedRun, request: otherWorkspace, now: NOW }),
    ).toEqual({
      resolved: false,
      reason: 'ACCESS_CHANGED',
      providerCallRequired: false,
      billableProviderCalls: 0,
    });
  });

  it('never resolves a saved run after the caller role or permissions change', () => {
    const savedRun = makeSavedRun();
    const roleChanged = makeDescriptor({
      scope: { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_EDITOR },
    });

    expect(
      reopenAiSavedRun({ savedRun, request: roleChanged, now: NOW }),
    ).toEqual({
      resolved: false,
      reason: 'ACCESS_CHANGED',
      providerCallRequired: false,
      billableProviderCalls: 0,
    });
  });

  it('refuses an expired saved run without calling a provider', () => {
    const savedRun = makeSavedRun(makeDescriptor(), { generatedAt: PAST });

    expect(
      reopenAiSavedRun({ savedRun, request: makeDescriptor(), now: NOW }),
    ).toEqual({
      resolved: false,
      reason: 'EXPIRED',
      providerCallRequired: false,
      billableProviderCalls: 0,
    });
  });

  it('refuses a saved run whose model, data or catalogue version moved', () => {
    const savedRun = makeSavedRun();
    const versionBumped = makeDescriptor({
      versions: { ...VERSIONS, catalogVersion: VERSIONS.catalogVersion + 1 },
    });

    expect(
      reopenAiSavedRun({ savedRun, request: versionBumped, now: NOW }),
    ).toEqual({
      resolved: false,
      reason: 'VERSION_MISMATCH',
      providerCallRequired: false,
      billableProviderCalls: 0,
    });
  });

  it('never lets an unreviewed public run resolve globally', () => {
    const unreviewed = makeDescriptor({
      visibility: 'PUBLIC_CATALOGUE',
      reviewedForGlobalSharing: false,
    });
    const savedRun = makeSavedRun(unreviewed);

    expect(savedRun.cacheKey.startsWith('scoped|')).toBe(true);
    expect(
      reopenAiSavedRun({ savedRun, request: unreviewed, now: NOW }),
    ).toEqual({
      resolved: false,
      reason: 'NOT_REVIEWED',
      providerCallRequired: false,
      billableProviderCalls: 0,
    });
  });

  it('resolves a reviewed public run from another workspace globally', () => {
    const savedRun = makeSavedRun(
      makeReviewedPublic({
        scope: { workspaceId: WORKSPACE_A, accessScopeId: ACCESS_OWNER },
      }),
    );
    const otherWorkspace = makeReviewedPublic({
      scope: { workspaceId: WORKSPACE_B, accessScopeId: ACCESS_EDITOR },
    });

    expect(savedRun.cacheKey.startsWith('global|')).toBe(true);
    expect(
      reopenAiSavedRun({ savedRun, request: otherWorkspace, now: NOW }),
    ).toEqual({
      resolved: true,
      reason: 'FRESH',
      providerCallRequired: false,
      billableProviderCalls: 0,
    });
  });

  it('estimates a rerun as one billable provider call behind explicit confirmation', () => {
    const savedRun = makeSavedRun();

    expect(estimateAiSavedRunRerun({ savedRun })).toEqual({
      cacheKey: savedRun.cacheKey,
      visibility: 'PRIVATE',
      isGlobal: false,
      providerCalls: 1,
      billableProviderCalls: 1,
      requiresExplicitConfirmation: true,
    });

    const globalRun = makeSavedRun(makeReviewedPublic());
    expect(estimateAiSavedRunRerun({ savedRun: globalRun }).isGlobal).toBe(
      true,
    );
  });

  it('never executes a rerun without explicit confirmation', () => {
    const estimate = estimateAiSavedRunRerun({ savedRun: makeSavedRun() });

    expect(executeAiSavedRunRerun({ estimate, confirmed: false })).toEqual({
      executed: false,
      reason: 'CONFIRMATION_REQUIRED',
      billableProviderCalls: 0,
    });
    expect(executeAiSavedRunRerun({ estimate, confirmed: true })).toEqual({
      executed: true,
      reason: 'EXECUTED',
      billableProviderCalls: estimate.billableProviderCalls,
    });
  });

  it('fails closed for a malformed expiry rather than serving a stale run', () => {
    const savedRun = makeSavedRun(makeDescriptor(), { generatedAt: PAST });

    expect(
      reopenAiSavedRun({
        savedRun: { ...savedRun, expiresAt: 'not-a-date' },
        request: makeDescriptor(),
        now: NOW,
      }).reason,
    ).toBe('EXPIRED');
    expect(
      reopenAiSavedRun({
        savedRun: { ...savedRun, expiresAt: FUTURE },
        request: makeDescriptor(),
        now: NOW,
      }).reason,
    ).toBe('FRESH');
    expect(
      reopenAiSavedRun({
        savedRun: { ...savedRun, expiresAt: PAST },
        request: makeDescriptor(),
        now: NOW,
      }).reason,
    ).toBe('EXPIRED');
  });
});
