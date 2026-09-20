import {
  type AiResultCacheDescriptor,
  type AiResultCacheEntry,
} from '@/ai/types/ai-result-cache.type';
import {
  type AiRerunEstimate,
  type AiSavedRun,
  type AiSavedRunReopenDecision,
  type AiSavedRunRerunDecision,
} from '@/ai/types/ai-saved-run.type';
import {
  computeAiResultExpiresAt,
  evaluateAiResultReuse,
  resolveAiResultCacheKey,
} from '@/ai/utils/ai-result-cache.util';

// SAVED RUN CONTRACT.
//
// Re-opening a saved run is a history read, not a model call: it evaluates the
// persisted entry against the caller's CURRENT access scope and versions, so a
// run carried over from another workspace, saved before a role change, or past
// its expiry simply does not resolve. Refreshing it costs money, so a rerun is
// a separate, explicitly estimated user action. C6: re-open incurs no provider
// call, and a private run never escapes its scope.

// One model invocation per rerun. A reviewed catalogue rerun is still a fresh
// provider call, so it bills the same as a private one.
const AI_RERUN_PROVIDER_CALLS = 1;

export const toAiResultCacheEntry = (
  savedRun: AiSavedRun,
): AiResultCacheEntry => ({
  cacheKey: savedRun.cacheKey,
  visibility: savedRun.descriptor.visibility,
  scope: savedRun.descriptor.scope,
  versions: savedRun.descriptor.versions,
  expiresAt: savedRun.expiresAt,
});

// Persisting a run stores the key the cache contract resolves, so a saved run
// and a cache entry can never disagree about identity or scope.
export const createAiSavedRun = (input: {
  runId: string;
  descriptor: AiResultCacheDescriptor;
  generatedAt: string;
  ttlMs?: number;
}): AiSavedRun => ({
  runId: input.runId,
  descriptor: input.descriptor,
  cacheKey: resolveAiResultCacheKey(input.descriptor).cacheKey,
  createdAt: input.generatedAt,
  expiresAt: computeAiResultExpiresAt({
    generatedAt: input.generatedAt,
    visibility: input.descriptor.visibility,
    ttlMs: input.ttlMs,
  }),
});

export const reopenAiSavedRun = (input: {
  savedRun: AiSavedRun;
  request: AiResultCacheDescriptor;
  now: string;
}): AiSavedRunReopenDecision => {
  const decision = evaluateAiResultReuse({
    entry: toAiResultCacheEntry(input.savedRun),
    request: input.request,
    now: input.now,
  });

  return {
    resolved: decision.reusable,
    reason: decision.reason,
    providerCallRequired: false,
    billableProviderCalls: 0,
  };
};

// The estimate never executes anything; it exists so the UI can show the cost
// before the user decides. The execute step takes it as a required argument.
export const estimateAiSavedRunRerun = (input: {
  savedRun: AiSavedRun;
}): AiRerunEstimate => {
  const resolvedKey = resolveAiResultCacheKey(input.savedRun.descriptor);

  return {
    cacheKey: resolvedKey.cacheKey,
    visibility: input.savedRun.descriptor.visibility,
    isGlobal: resolvedKey.isGlobal,
    providerCalls: AI_RERUN_PROVIDER_CALLS,
    billableProviderCalls: AI_RERUN_PROVIDER_CALLS,
    requiresExplicitConfirmation: true,
  };
};

export const executeAiSavedRunRerun = (input: {
  estimate: AiRerunEstimate;
  confirmed: boolean;
}): AiSavedRunRerunDecision => {
  if (!input.confirmed) {
    return {
      executed: false,
      reason: 'CONFIRMATION_REQUIRED',
      billableProviderCalls: 0,
    };
  }

  return {
    executed: true,
    reason: 'EXECUTED',
    billableProviderCalls: input.estimate.billableProviderCalls,
  };
};
