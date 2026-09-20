import {
  type AiResultCacheDescriptor,
  type AiResultReuseReason,
  type AiResultVisibility,
} from './ai-result-cache.type';

// A saved run is a persisted, already-authorized AI result. It is deliberately
// NOT a second cache: it stores the same descriptor the cache contract resolves
// to a key, plus the run identity a user re-opens from their history. Re-opening
// replays this payload, so re-reading work never reaches a provider.
export type AiSavedRun = {
  runId: string;
  descriptor: AiResultCacheDescriptor;
  cacheKey: string;
  createdAt: string;
  expiresAt?: string | null;
};

export type AiSavedRunReopenDecision = {
  resolved: boolean;
  reason: AiResultReuseReason;
  // C6: a re-open is a pure read. It never calls a provider and never bills
  // quota, whether or not the persisted entry is still reusable.
  providerCallRequired: false;
  billableProviderCalls: 0;
};

export type AiSavedRunRerunReason = 'EXECUTED' | 'CONFIRMATION_REQUIRED';

// The cost estimate a caller must surface before a rerun. Its presence as an
// argument to the execute step is what makes a rerun explicit: there is no API
// to rerun without first holding an estimate.
export type AiRerunEstimate = {
  cacheKey: string;
  visibility: AiResultVisibility;
  isGlobal: boolean;
  providerCalls: number;
  billableProviderCalls: number;
  requiresExplicitConfirmation: true;
};

export type AiSavedRunRerunDecision = {
  executed: boolean;
  reason: AiSavedRunRerunReason;
  billableProviderCalls: number;
};
