// AI RESULT CACHE CONTRACT (P9.2b).
//
// The Bilan `aiCacheEntry` object keeps one row per expensive model call, keyed
// by kind + model + payload digest + catalogue version, so a catalogue refresh
// invalidates exactly the runs whose input changed. This module is the pure,
// database-free half of that pattern, generalised for every app: a private
// result belongs to one workspace AND one access scope, a public catalogue-only
// result may be shared instance-wide only after a reviewer approved it, and an
// entry is reusable only while its model/data/catalogue versions match and it
// has not expired. C6: no cross-workspace cache leak.

export type AiResultVisibility = 'PRIVATE' | 'PUBLIC_CATALOGUE';

export type AiResultScope = {
  workspaceId: string;
  // Opaque fingerprint of the caller's effective permissions (role + grants).
  // A role or grant change produces a new id, so the old key is unreachable.
  accessScopeId: string;
};

export type AiResultVersions = {
  modelVersion: string;
  dataVersion: string;
  catalogVersion: number;
};

export type AiResultCacheDescriptor = {
  kind: string;
  visibility: AiResultVisibility;
  payloadHash: string;
  scope: AiResultScope;
  versions: AiResultVersions;
  // Set only after a human review confirms the payload admits no private data.
  reviewedForGlobalSharing?: boolean;
};

export type AiResultCacheEntry = {
  cacheKey: string;
  visibility: AiResultVisibility;
  scope: AiResultScope;
  versions: AiResultVersions;
  expiresAt?: string | null;
};

export type AiResultReuseReason =
  | 'FRESH'
  | 'KEY_MISMATCH'
  | 'NOT_REVIEWED'
  | 'EXPIRED'
  | 'VERSION_MISMATCH'
  | 'ACCESS_CHANGED';

export type AiResultReuseDecision = {
  reusable: boolean;
  reason: AiResultReuseReason;
};

export type AiAccessScopeInput = {
  roleUniversalIdentifier?: string | null;
  permissionFingerprint?: string | null;
};

export type ResolvedAiResultCacheKey = {
  cacheKey: string;
  isGlobal: boolean;
};

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

// A missing expiry is an explicitly non-expiring entry (the `aiCacheEntry`
// `expiresAt` field is nullable); only a concrete past timestamp is stale. An
// unparseable timestamp fails closed rather than serving potentially stale data.
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
