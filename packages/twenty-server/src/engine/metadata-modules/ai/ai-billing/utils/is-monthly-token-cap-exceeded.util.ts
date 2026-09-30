import { isDefined } from 'twenty-shared/utils';

// A null/zero cap means "no cap", and zero recorded usage never trips a cap:
// both must fail open so ordinary (non-AI) work and unconfigured self-hosted
// workspaces are never blocked.
export const isMonthlyTokenCapExceeded = ({
  usedTokens,
  capTokens,
}: {
  usedTokens: number;
  capTokens: number | null | undefined;
}): boolean => {
  if (!isDefined(capTokens) || capTokens <= 0) {
    return false;
  }

  return usedTokens >= capTokens;
};
