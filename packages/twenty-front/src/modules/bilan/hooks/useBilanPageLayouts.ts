import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER } from '@/quick-create/constants/A2eAccountingApplicationUniversalIdentifier';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useQuery } from '@apollo/client/react';
import { FindStandalonePageLayoutLinksDocument } from '~/generated-metadata/graphql';

export const useBilanPageLayouts = () => {
  const applications = useAtomStateValue(applicationsSelector);
  const hasBilan = applications.some(
    (application) =>
      application.universalIdentifier ===
      A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
  );
  const { data } = useQuery(FindStandalonePageLayoutLinksDocument, {
    skip: !hasBilan,
  });
  return hasBilan ? (data?.getPageLayouts ?? []) : [];
};
