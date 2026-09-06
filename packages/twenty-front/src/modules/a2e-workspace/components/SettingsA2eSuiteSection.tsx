import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { A2eSuiteApplicationCard } from '~/modules/a2e-workspace/components/A2eSuiteApplicationCard';
import { useA2eSuiteApplications } from '~/modules/a2e-workspace/hooks/useA2eSuiteApplications';
import { SettingsApplicationsTable } from '~/pages/settings/applications/components/SettingsApplicationsTable';

const StyledCardsGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 800px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const SettingsA2eSuiteSection = () => {
  const { t } = useLingui();
  const { installedApplications, availableApplications } =
    useA2eSuiteApplications();

  if (
    installedApplications.length === 0 &&
    availableApplications.length === 0
  ) {
    return null;
  }

  return (
    <Section>
      <H2Title
        title={t`A2E Suite`}
        description={t`The all-in-one workspace modules built into this suite. Install only what you need.`}
      />
      {installedApplications.length > 0 && (
        <SettingsApplicationsTable applications={installedApplications} />
      )}
      {availableApplications.length > 0 && (
        <StyledCardsGrid>
          {availableApplications.map((application) => (
            <A2eSuiteApplicationCard
              key={application.id}
              application={application}
            />
          ))}
        </StyledCardsGrid>
      )}
    </Section>
  );
};
