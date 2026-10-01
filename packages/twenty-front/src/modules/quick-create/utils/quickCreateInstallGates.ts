import { A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER } from '@/quick-create/constants/A2eAccountingApplicationUniversalIdentifier';
import { A2E_PROJECTS_APPLICATION_UNIVERSAL_IDENTIFIER } from '@/quick-create/constants/A2eProjectsApplicationUniversalIdentifier';

export const isA2eProjectsApplicationInstalled = (
  installedApplicationUniversalIdentifiers: string[],
): boolean =>
  installedApplicationUniversalIdentifiers.includes(
    A2E_PROJECTS_APPLICATION_UNIVERSAL_IDENTIFIER,
  );

export const isA2eAccountingApplicationInstalled = (
  installedApplicationUniversalIdentifiers: string[],
): boolean =>
  installedApplicationUniversalIdentifiers.includes(
    A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
  );
