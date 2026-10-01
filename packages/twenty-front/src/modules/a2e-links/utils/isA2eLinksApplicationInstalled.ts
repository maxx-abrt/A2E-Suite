import { A2E_LINKS_APPLICATION_UNIVERSAL_IDENTIFIER } from '@/a2e-links/constants/A2eLinksApplicationUniversalIdentifier';

export const isA2eLinksApplicationInstalled = (
  installedApplicationUniversalIdentifiers: string[],
): boolean =>
  installedApplicationUniversalIdentifiers.includes(
    A2E_LINKS_APPLICATION_UNIVERSAL_IDENTIFIER,
  );
