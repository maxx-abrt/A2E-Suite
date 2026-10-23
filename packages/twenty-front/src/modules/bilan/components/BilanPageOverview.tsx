import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { Link } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import {
  IconCalendarDue,
  IconCoins,
  IconFileText,
  IconArrowUpRight,
  useIcons,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { A2eLearnMoreLink } from '@/a2e-help/components/A2eLearnMoreLink';
import { HomeDashboardCard } from '@/home-dashboard/components/HomeDashboardCard';
import { PendingBilanWidget } from '@/home-dashboard/components/PendingBilanWidget';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { pageLayoutsWithRelationsSelector } from '@/page-layout/states/pageLayoutsWithRelationsSelector';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { BILAN_METADATA_UNIVERSAL_IDENTIFIERS } from '@/bilan/constants/BilanMetadata';
import { BilanCaptureActions } from '@/bilan/components/BilanCaptureActions';

const BILAN_WORK_SECTIONS = [
  {
    title: msg`Daily work`,
    Icon: IconCoins,
    objects: [
      {
        universalIdentifier: BILAN_METADATA_UNIVERSAL_IDENTIFIERS.invoice,
        label: msg`Invoices`,
        description: msg`Track payments and follow up with clients.`,
      },
      {
        universalIdentifier: 'b11a0300-0000-4000-8000-000000000000',
        label: msg`Quotes`,
        description: msg`Prepare your next proposal.`,
      },
      {
        universalIdentifier: BILAN_METADATA_UNIVERSAL_IDENTIFIERS.financeEntry,
        label: msg`Transactions`,
        description: msg`Keep income and expenses in one place.`,
      },
    ],
  },
  {
    title: msg`Plan ahead`,
    Icon: IconFileText,
    objects: [
      {
        universalIdentifier: 'b11a0600-0000-4000-8000-000000000000',
        label: msg`Budgets`,
        description: msg`Plan resources for your activities.`,
      },
      {
        universalIdentifier: 'b11a0900-0000-4000-8000-000000000000',
        label: msg`Financial plans`,
        description: msg`Build a plan from a reusable template.`,
      },
      {
        universalIdentifier: 'b11a0c00-0000-4000-8000-000000000000',
        label: msg`Funding applications`,
        description: msg`Prepare applications and track deadlines.`,
      },
    ],
  },
];

const StyledOverview = styled.section`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[5]};
  padding: ${themeCssVariables.spacing[6]};

  @media (max-width: 600px) {
    padding: ${themeCssVariables.spacing[4]};
  }

  @media print {
    display: none;
  }
`;

const StyledHeader = styled.header`
  align-items: center;
  background:
    radial-gradient(
      ellipse at top right,
      ${themeCssVariables.background.transparent.medium},
      transparent 65%
    ),
    ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[5]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[6]};
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0 0 ${themeCssVariables.spacing[2]};
`;

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.6;
  margin: ${themeCssVariables.spacing[1]} 0;
`;

const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledCards = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
`;

const StyledLink = styled(Link)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]};
  text-decoration: none;

  > div {
    flex: 1;
    min-width: 0;
  }

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: -2px;
  }
`;

type BilanPageOverviewProps = { pageLayoutId: string };

export const BilanPageOverview = ({ pageLayoutId }: BilanPageOverviewProps) => {
  const pageLayoutsWithRelations = useAtomStateValue(
    pageLayoutsWithRelationsSelector,
  );
  const isBilanDashboard = pageLayoutsWithRelations.some(
    (pageLayout) =>
      pageLayout.id === pageLayoutId &&
      pageLayout.universalIdentifier ===
        BILAN_METADATA_UNIVERSAL_IDENTIFIERS.dashboard,
  );

  const catalog = pageLayoutsWithRelations.find(
    (pageLayout) =>
      pageLayout.universalIdentifier ===
      BILAN_METADATA_UNIVERSAL_IDENTIFIERS.catalog,
  );
  return isBilanDashboard ? (
    <BilanOverviewContent
      catalogPath={
        catalog
          ? getAppPath(AppPath.PageLayoutPage, { pageLayoutId: catalog.id })
          : null
      }
    />
  ) : null;
};

type BilanOverviewContentProps = { catalogPath: string | null };

const BilanOverviewContent = ({ catalogPath }: BilanOverviewContentProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();
  const { openTemplateGallery } = useOpenTemplateGallery();
  const financeEntry = readableObjectMetadataItems.find(
    (item) =>
      item.universalIdentifier ===
      BILAN_METADATA_UNIVERSAL_IDENTIFIERS.financeEntry,
  );
  const bookEntry = readableObjectMetadataItems.find(
    (item) =>
      item.universalIdentifier ===
      BILAN_METADATA_UNIVERSAL_IDENTIFIERS.bookEntry,
  );
  const organization = readableObjectMetadataItems.find(
    (objectMetadataItem) =>
      objectMetadataItem.universalIdentifier ===
      BILAN_METADATA_UNIVERSAL_IDENTIFIERS.organization,
  );
  const sections = BILAN_WORK_SECTIONS.map((section) => ({
    ...section,
    entries: section.objects.flatMap((entry) => {
      const objectMetadataItem = readableObjectMetadataItems.find(
        (item) => item.universalIdentifier === entry.universalIdentifier,
      );
      return objectMetadataItem ? [{ ...entry, objectMetadataItem }] : [];
    }),
  })).filter((section) => section.entries.length > 0);

  return (
    <StyledOverview aria-label={t`Bilan overview`}>
      <StyledHeader>
        <div>
          <StyledTitle>{t`Bilan`}</StyledTitle>
          <StyledDescription>{t`Your finances, connected to the work behind them.`}</StyledDescription>
          <A2eLearnMoreLink appKey="bilan" />
        </div>
        <StyledActions>
          {financeEntry && (
            <BilanCaptureActions objectMetadataItem={financeEntry} />
          )}
          {bookEntry && (
            <Button
              title={t`Open book`}
              ariaLabel={t`Open book`}
              variant="secondary"
              to={getAppPath(AppPath.RecordIndexPage, {
                objectNamePlural: bookEntry.namePlural,
              })}
            />
          )}
          {catalogPath && (
            <Button
              title={t`Find funding`}
              ariaLabel={t`Find funding`}
              variant="secondary"
              to={catalogPath}
            />
          )}
          {organization && (
            <Button
              title={t`Organization profile`}
              ariaLabel={t`Organization profile`}
              variant="secondary"
              to={getAppPath(AppPath.RecordIndexPage, {
                objectNamePlural: organization.namePlural,
              })}
            />
          )}
          <Button
            title={t`Templates`}
            ariaLabel={t`Templates`}
            Icon={IconFileText}
            variant="secondary"
            onClick={() => openTemplateGallery({ category: 'Bilan' })}
          />
        </StyledActions>
      </StyledHeader>
      <StyledCards>
        {sections.map((section) => (
          <HomeDashboardCard
            key={section.title.id}
            title={t(section.title)}
            Icon={section.Icon}
            testId={`bilan-section-${section.title.id}`}
          >
            {section.entries.map(
              ({ objectMetadataItem, label, description }) => {
                const Icon = getIcon(objectMetadataItem.icon);
                return (
                  <StyledLink
                    key={objectMetadataItem.id}
                    to={getAppPath(AppPath.RecordIndexPage, {
                      objectNamePlural: objectMetadataItem.namePlural,
                    })}
                  >
                    <Icon size={18} aria-hidden />
                    <div>
                      <span>{t(label)}</span>
                      <StyledDescription>{t(description)}</StyledDescription>
                    </div>
                    <IconArrowUpRight size={14} aria-hidden />
                  </StyledLink>
                );
              },
            )}
          </HomeDashboardCard>
        ))}
        <HomeDashboardCard
          title={t`Needs attention`}
          Icon={IconCalendarDue}
          testId="bilan-needs-attention"
        >
          <PendingBilanWidget />
        </HomeDashboardCard>
      </StyledCards>
    </StyledOverview>
  );
};
