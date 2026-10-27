import { A2E_APPLICATION_LOGOS } from '@/a2e-workspace/constants/A2eApplicationLogos';

export const getA2eApplicationLogo = (
  universalIdentifier?: string | null,
): string | undefined =>
  universalIdentifier ? A2E_APPLICATION_LOGOS[universalIdentifier] : undefined;
