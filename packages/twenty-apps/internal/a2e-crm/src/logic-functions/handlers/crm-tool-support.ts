import { CoreApiClient } from 'twenty-client-sdk/core';

// Shared plumbing for the read-only P9.2 CRM tools.
//
// Both tools read a native CRM record (company, person or messageThread)
// through the caller-context Core API client and never mutate anything:
// applying a reply or an enrichment stays a separate, human-confirmed action
// (C6). The client is injectable so node:test exercises the reads without a
// live Core API (the generated client throws before generation).

export type CoreClientLike = Pick<CoreApiClient, 'query'>;

export const coreClient = (): CoreApiClient => new CoreApiClient();

// Twenty findOne resolvers (`person`, `company`, `messageThread`) take one
// required `filter` argument and no `id` argument (server
// get-resolver-args.util.ts). A `person(id: …)` read makes the generated genql
// client throw (`no typing defined for argument \`id\``) before any request,
// so both tools failed on every call. Mutations keep `id`.
export type FindOneByIdArgs = {
  filter: { id: { eq: string } };
};

export const buildFindOneByIdArgs = (id: string): FindOneByIdArgs => ({
  filter: { id: { eq: id } },
});

export const hasNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export type NormalizedText =
  | { valid: true; value: string | null }
  | { valid: false };

// A tool input is JSON: an optional string is either absent, a non-blank
// bounded string, or a caller mistake. A provided-but-blank value is refused
// rather than silently treated as "no option".
export const normalizeOptionalText = (
  value: unknown,
  maxLength: number,
): NormalizedText => {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== 'string') {
    return { valid: false };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return { valid: false };
  }

  return { valid: true, value: trimmed };
};

export type NormalizedPositiveInt =
  | { valid: true; value: number | null }
  | { valid: false };

export const normalizeOptionalPositiveInt = (
  value: unknown,
  max: number,
): NormalizedPositiveInt => {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > max
  ) {
    return { valid: false };
  }

  return { valid: true, value };
};
