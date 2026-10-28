import { IconBilan } from '@/a2e-workspace/components/A2eAppLogo';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { Link } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';
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
import { pageLayoutPersistedComponentState } from '@/page-layout/states/pageLayoutPersistedComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useBilanPageLayouts } from '@/bilan/hooks/useBilanPageLayouts';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { BILAN_METADATA_UNIVERSAL_IDENTIFIERS } from '@/bilan/constants/BilanMetadata';
import { BilanProfileSetup } from '@/bilan/components/BilanProfileSetup';
import { BilanPulse } from '@/bilan/components/BilanPulse';
import { BilanQuickEntryAction } from '@/bilan/components/BilanQuickEntryAction';
import { BilanTransactionReview } from '@/bilan/components/BilanTransactionReview';
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
        universalIdentifier: BILAN_METADATA_UNIVERSAL_IDENTIFIERS.budget,
        label: msg`Budgets`,
        description: msg`Plan resources for your activities.`,
      },
      {
        universalIdentifier: 'b11a0900-0000-4000-8000-000000000000',
        label: msg`Financial plans`,
        description: msg`Build a plan from a reusable template.`,
      },
      {
        universalIdentifier:
          BILAN_METADATA_UNIVERSAL_IDENTIFIERS.savedSubvention,
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
  align-items: flex-end;
  background:
    radial-gradient(
      ellipse at top right,
      ${themeCssVariables.accent.tertiary},
      transparent 58%
    ),
    ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.lg};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[5]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[6]};

  @media (max-width: 600px) {
    padding: ${themeCssVariables.spacing[4]};
  }
`;

const StyledIdentity = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
  min-width: 0;
`;

const StyledLogo = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-shrink: 0;
  height: 52px;
  justify-content: center;
  width: 52px;
`;

const StyledEyebrow = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  display: block;
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.08em;
  margin-bottom: ${themeCssVariables.spacing[1]};
  text-transform: uppercase;
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0;
`;

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: ${themeCssVariables.spacing[1]} 0 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
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
  const pageLayoutPersisted = useAtomComponentStateValue(
    pageLayoutPersistedComponentState,
  );
  const pageLayouts = useBilanPageLayouts();
  const isBilanDashboard =
    pageLayoutPersisted?.id === pageLayoutId &&
    pageLayoutPersisted?.universalIdentifier ===
      BILAN_METADATA_UNIVERSAL_IDENTIFIERS.dashboard;
  const catalog = pageLayouts.find(
    (layout) =>
      layout.universalIdentifier ===
      BILAN_METADATA_UNIVERSAL_IDENTIFIERS.catalog,
  );
  return isBilanDashboard ? (
    <BilanOverviewContent
      catalogPath={
        isDefined(catalog?.id)
          ? getAppPath(AppPath.PageLayoutPage, { pageLayoutId: catalog.id })
          : null
      }
    />
  ) : null;
};

type BilanOverviewContentProps = { catalogPath: string | null };

const BilanOverviewContent = ({ catalogPath }: BilanOverviewContentProps) => {
  const { i18n } = useLingui();
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
    <StyledOverview aria-label={i18n._(msg`Bilan overview`)}>
      <StyledHeader>
        <StyledIdentity>
          <StyledLogo>
            <IconBilan size={34} />
          </StyledLogo>
          <div>
            <StyledEyebrow>{i18n._(msg`Finance`)}</StyledEyebrow>
            <StyledTitle>{i18n._(msg`Bilan`)}</StyledTitle>
            <StyledDescription>
              {i18n._(msg`Your finances, connected to the work behind them.`)}
            </StyledDescription>
            <A2eLearnMoreLink appKey="bilan" />
          </div>
        </StyledIdentity>
        <StyledActions>
          {financeEntry && (
            <>
              <BilanQuickEntryAction objectMetadataItem={financeEntry} />
              <BilanCaptureActions objectMetadataItem={financeEntry} />
            </>
          )}
          {bookEntry && (
            <Button
              title={i18n._(msg`Open book`)}
              ariaLabel={i18n._(msg`Open book`)}
              size="small"
              variant="secondary"
              to={getAppPath(AppPath.RecordIndexPage, {
                objectNamePlural: bookEntry.namePlural,
              })}
            />
          )}
          {catalogPath && (
            <Button
              title={i18n._(msg`Find funding`)}
              ariaLabel={i18n._(msg`Find funding`)}
              size="small"
              variant="secondary"
              to={catalogPath}
            />
          )}
          {organization && (
            <Button
              title={i18n._(msg`Organization profile`)}
              ariaLabel={i18n._(msg`Organization profile`)}
              size="small"
              variant="secondary"
              to={getAppPath(AppPath.RecordIndexPage, {
                objectNamePlural: organization.namePlural,
              })}
            />
          )}
          <Button
            title={i18n._(msg`Templates`)}
            ariaLabel={i18n._(msg`Templates`)}
            Icon={IconFileText}
            size="small"
            variant="secondary"
            onClick={() => openTemplateGallery({ category: 'Bilan' })}
          />
        </StyledActions>
      </StyledHeader>
      {organization && <BilanProfileSetup objectMetadataItem={organization} />}
      <BilanPulse catalogPath={catalogPath} />
      {financeEntry && (
        <BilanTransactionReview objectMetadataItem={financeEntry} />
      )}
      <StyledCards>
        {sections.map((section) => (
          <HomeDashboardCard
            key={section.title.id}
            title={i18n._(section.title)}
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
                      <span>{i18n._(label)}</span>
                      <StyledDescription>
                        {i18n._(description)}
                      </StyledDescription>
                    </div>
                    <IconArrowUpRight size={14} aria-hidden />
                  </StyledLink>
                );
              },
            )}
          </HomeDashboardCard>
        ))}
        <HomeDashboardCard
          title={i18n._(msg`Needs attention`)}
          Icon={IconCalendarDue}
          testId="bilan-needs-attention"
        >
          <PendingBilanWidget />
        </HomeDashboardCard>
      </StyledCards>
    </StyledOverview>
  );
};
