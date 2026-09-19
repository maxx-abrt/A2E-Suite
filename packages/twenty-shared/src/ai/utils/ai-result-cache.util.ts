import {
  type AiAccessScopeInput,
  type AiResultCacheDescriptor,
  type AiResultCacheEntry,
  type AiResultReuseDecision,
  type AiResultScope,
  type AiResultVersions,
  type AiResultVisibility,
  type ResolvedAiResultCacheKey,
} from '@/ai/types/ai-result-cache.type';

// AI RESULT CACHE CONTRACT.
//
// Every expensive model call can be stored once and reused, but a private
// result must never be shared across workspaces. A private result therefore
// belongs to one workspace AND one access scope (the caller's role + grants),
// while a public catalogue-only result may be shared instance-wide only after
// a reviewer approved it. Reuse additionally requires the model, data and
// catalogue versions to match and the entry not to have expired. C6: no
// cross-workspace cache leak.

const CACHE_KEY_GLOBAL_PREFIX = 'global';
const CACHE_KEY_SCOPED_PREFIX = 'scoped';
const EMPTY_SCOPE_PART = 'none';

const normaliseScopePart = (value: string | null | undefined): string =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : EMPTY_SCOPE_PART;

// A deterministic fingerprint, so swapping a role or editing a permission set
// changes the access scope even though the workspace id does not.
export const buildAccessScopeId = (input: AiAccessScopeInput): string =>
  `role:${normaliseScopePart(input.roleUniversalIdentifier)}|perms:${normaliseScopePart(input.permissionFingerprint)}`;

// Only a public-catalogue result that a reviewer approved may skip the
// workspace/access scope and be shared instance-wide.
export const isGloballyShareable = (
  descriptor: AiResultCacheDescriptor,
): boolean =>
  descriptor.visibility === 'PUBLIC_CATALOGUE' &&
  descriptor.reviewedForGlobalSharing === true;

export const resolveAiResultCacheKey = (
  descriptor: AiResultCacheDescriptor,
): ResolvedAiResultCacheKey => {
  const versionSegment = [
    `kind:${descriptor.kind}`,
    `model:${descriptor.versions.modelVersion}`,
    `data:${descriptor.versions.dataVersion}`,
    `catalogue:${descriptor.versions.catalogVersion}`,
    `payload:${descriptor.payloadHash}`,
  ].join('|');

  if (isGloballyShareable(descriptor)) {
    return {
      cacheKey: `${CACHE_KEY_GLOBAL_PREFIX}|${versionSegment}`,
      isGlobal: true,
    };
  }

  return {
    cacheKey: [
      CACHE_KEY_SCOPED_PREFIX,
      `workspace:${descriptor.scope.workspaceId}`,
      `access:${descriptor.scope.accessScopeId}`,
      versionSegment,
    ].join('|'),
    isGlobal: false,
  };
};

// A private result must not outlive the reason it was cached: permissions and
// data move, so it gets a short life. A reviewed public catalogue result tracks
// an edition, so it may live longer.
export const PRIVATE_AI_RESULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PUBLIC_CATALOGUE_AI_RESULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const computeAiResultExpiresAt = (input: {
  generatedAt: string;
  visibility: AiResultVisibility;
  ttlMs?: number;
}): string => {
  const generatedAtMs = Date.parse(input.generatedAt);

  if (Number.isNaN(generatedAtMs)) {
    throw new Error(`Invalid generatedAt: ${input.generatedAt}`);
  }

  const ttlMs =
    input.ttlMs ??
    (input.visibility === 'PUBLIC_CATALOGUE'
      ? PUBLIC_CATALOGUE_AI_RESULT_TTL_MS
      : PRIVATE_AI_RESULT_TTL_MS);

  return new Date(generatedAtMs + ttlMs).toISOString();
};

// A missing expiry is an explicitly non-expiring entry; only a concrete past
// timestamp is stale. An unparseable timestamp fails closed rather than
// serving potentially stale data.
export const isAiResultExpired = (input: {
  expiresAt?: string | null;
  now: string;
}): boolean => {
  if (input.expiresAt === null || input.expiresAt === undefined) {
    return false;
  }

  const expiresAtMs = Date.parse(input.expiresAt);
  const nowMs = Date.parse(input.now);

  if (Number.isNaN(expiresAtMs) || Number.isNaN(nowMs)) {
    return true;
  }

  return expiresAtMs <= nowMs;
};

export const hasAiResultVersionDrift = (
  entryVersions: AiResultVersions,
  currentVersions: AiResultVersions,
): boolean =>
  entryVersions.modelVersion !== currentVersions.modelVersion ||
  entryVersions.dataVersion !== currentVersions.dataVersion ||
  entryVersions.catalogVersion !== currentVersions.catalogVersion;

export const hasAiResultScopeDrift = (
  entryScope: AiResultScope,
  currentScope: AiResultScope,
): boolean =>
  entryScope.workspaceId !== currentScope.workspaceId ||
  entryScope.accessScopeId !== currentScope.accessScopeId;

export const evaluateAiResultReuse = (input: {
  entry: AiResultCacheEntry;
  request: AiResultCacheDescriptor;
  now: string;
}): AiResultReuseDecision => {
  const { entry, request } = input;

  // Never share an unreviewed public result globally: it resolves to a scoped
  // key, so an existing global entry can never satisfy this request.
  if (
    request.visibility === 'PUBLIC_CATALOGUE' &&
    !isGloballyShareable(request)
  ) {
    return { reusable: false, reason: 'NOT_REVIEWED' };
  }

  if (entry.visibility !== request.visibility) {
    return { reusable: false, reason: 'KEY_MISMATCH' };
  }

  // Scope isolation: a private entry only satisfies its own workspace + access
  // scope, so a different workspace or a role/permission change always misses.
  if (
    entry.visibility === 'PRIVATE' &&
    hasAiResultScopeDrift(entry.scope, request.scope)
  ) {
    return { reusable: false, reason: 'ACCESS_CHANGED' };
  }

  if (hasAiResultVersionDrift(entry.versions, request.versions)) {
    return { reusable: false, reason: 'VERSION_MISMATCH' };
  }

  if (entry.cacheKey !== resolveAiResultCacheKey(request).cacheKey) {
    return { reusable: false, reason: 'KEY_MISMATCH' };
  }

  if (isAiResultExpired({ expiresAt: entry.expiresAt, now: input.now })) {
    return { reusable: false, reason: 'EXPIRED' };
  }

  return { reusable: true, reason: 'FRESH' };
};
