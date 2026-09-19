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
