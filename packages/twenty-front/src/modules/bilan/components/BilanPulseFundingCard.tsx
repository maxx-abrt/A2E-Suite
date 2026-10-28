import { styled } from '@linaria/react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { IconStar } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  BilanPulseCard,
  BilanPulseErrorState,
  StyledBilanPulseValue,
} from '@/bilan/components/BilanPulseCard';
import { useBilanPagedRecords } from '@/bilan/hooks/useBilanPagedRecords';
import { type BilanSavedSubventionRecord } from '@/bilan/types/BilanPulse';
import { BILAN_PULSE_PALETTE } from '@/bilan/constants/BilanPulsePalette';
import { buildBilanFunding } from '@/bilan/utils/buildBilanPulse';
import {
  formatBilanDate,
  formatBilanMoney,
  getBilanLocale,
} from '@/bilan/utils/formatBilanPulse';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

const BILAN_FUNDING_MAX_PAGES = 1;

const BILAN_VISIBLE_DEADLINE_COUNT = 3;

const StyledLayout = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[5]};
  grid-template-columns: minmax(180px, 0.9fr) minmax(280px, 1.4fr) minmax(
      220px,
      1fr
    );

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const StyledColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledColumnTitle = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledMetricMeta = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
`;

const StyledStages = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledStage = styled.div<{ isMuted: boolean }>`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  opacity: ${({ isMuted }) => (isMuted ? 0.55 : 1)};
  overflow: hidden;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledStageLabel = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: inline-flex;
  font-size: 10px;
  gap: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`;

const StyledStageDot = styled.i<{ tone: string }>`
  background: ${({ tone }) => tone};
  border-radius: ${themeCssVariables.border.radius.pill};
  display: inline-block;
  height: 6px;
  width: 6px;
`;

const StyledStageCount = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 1.2;
`;

const StyledStageAmount = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledDeadlineList = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledDeadlineRow = styled.div`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[2]} 0;

  &:first-of-type {
    border-top: none;
  }
`;

const StyledDeadlineDate = styled.span<{ isOverdue: boolean }>`
  color: ${({ isOverdue }) =>
    isOverdue
      ? themeCssVariables.color.red
      : themeCssVariables.font.color.tertiary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
  width: 52px;
`;

const StyledDeadlineName = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  flex: 1;
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledDeadlineAmount = styled.span`
  color: ${themeCssVariables.font.color.primary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
`;

type BilanPulseFundingCardProps = {
  catalogPath: string | null;
};

const getStageColor = (status: string): string => {
  if (status === 'GRANTED') {
    return BILAN_PULSE_PALETTE.funding.granted;
  }

  if (status === 'SUBMITTED') {
    return BILAN_PULSE_PALETTE.funding.submitted;
  }

  if (status === 'PREPARING') {
    return BILAN_PULSE_PALETTE.funding.preparing;
  }

  return BILAN_PULSE_PALETTE.funding.shortlisted;
};

export const BilanPulseFundingCard = ({
  catalogPath,
}: BilanPulseFundingCardProps) => {
  const { i18n } = useLingui();
  const locale = getBilanLocale(i18n.locale);
  const now = useMemo(() => new Date(), []);
  const { objectMetadataItem, records, error, refetch } = useBilanPagedRecords<
    BilanSavedSubventionRecord & ObjectRecord
  >({
    objectNameSingular: 'savedSubvention',
    orderBy: [{ deadline: 'AscNullsLast' }],
    maxPages: BILAN_FUNDING_MAX_PAGES,
    recordGqlFields: {
      id: true,
      name: true,
      status: true,
      deadline: true,
      amountRequested: true,
      amountGranted: true,
    },
  });
  const summary = useMemo(
    () =>
      buildBilanFunding(
        records as unknown as BilanSavedSubventionRecord[],
        now,
      ),
    [records, now],
  );
  const fundingIndexPath = getAppPath(AppPath.RecordIndexPage, {
    objectNamePlural: objectMetadataItem.namePlural,
  });
  const actionPath = catalogPath ?? fundingIndexPath;
  const visibleDeadlines = summary.deadlines.slice(
    0,
    BILAN_VISIBLE_DEADLINE_COUNT,
  );

  const getStageLabel = (status: string): string => {
    switch (status) {
      case 'SHORTLISTED':
        return i18n._(msg`Shortlisted`);
      case 'PREPARING':
        return i18n._(msg`Preparing`);
      case 'SUBMITTED':
        return i18n._(msg`Submitted`);
      case 'GRANTED':
        return i18n._(msg`Granted`);
      default:
        return status;
    }
  };

  // The funding row is additional context, not a required empty dashboard
  // block: it appears only when there is an active dossier or a read failure.
  if (!error && summary.activeCount === 0) {
    return null;
  }

  return (
    <BilanPulseCard
      title={i18n._(msg`Funding`)}
      Icon={IconStar}
      span={12}
      meta={i18n._(msg`${summary.activeCount} active`)}
      action={{ label: i18n._(msg`Find funding`), to: actionPath }}
      testId="bilan-funding-card"
    >
      {error ? (
        <BilanPulseErrorState
          message={i18n._(msg`Funding could not load.`)}
          retryLabel={i18n._(msg`Retry funding`)}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : (
        <StyledLayout>
          <StyledColumn>
            <StyledColumnTitle>{i18n._(msg`Active funding`)}</StyledColumnTitle>
            <StyledBilanPulseValue>
              {formatBilanMoney(
                summary.activeRequestedMicros,
                summary.currencyCode,
                locale,
              )}
            </StyledBilanPulseValue>
            <StyledMetricMeta>
              {i18n._(msg`Granted`)}{' '}
              {formatBilanMoney(
                summary.activeGrantedMicros,
                summary.currencyCode,
                locale,
              )}
            </StyledMetricMeta>
            {summary.nextDeadline !== null && (
              <StyledMetricMeta>
                {i18n._(msg`Next deadline`)}{' '}
                {formatBilanDate(summary.nextDeadline, locale)}
              </StyledMetricMeta>
            )}
          </StyledColumn>
          <StyledColumn>
            <StyledColumnTitle>{i18n._(msg`Pipeline`)}</StyledColumnTitle>
            <StyledStages>
              {summary.stages.map((stage) => (
                <StyledStage key={stage.status} isMuted={stage.count === 0}>
                  <StyledStageLabel>
                    <StyledStageDot tone={getStageColor(stage.status)} />
                    {getStageLabel(stage.status)}
                  </StyledStageLabel>
                  <StyledStageCount>{stage.count}</StyledStageCount>
                  <StyledStageAmount>
                    {formatBilanMoney(
                      stage.requestedMicros,
                      summary.currencyCode,
                      locale,
                    )}
                  </StyledStageAmount>
                </StyledStage>
              ))}
            </StyledStages>
          </StyledColumn>
          <StyledColumn>
            <StyledColumnTitle>{i18n._(msg`Next deadlines`)}</StyledColumnTitle>
            {visibleDeadlines.length === 0 ? (
              <StyledMetricMeta>
                {i18n._(msg`No deadline recorded.`)}
              </StyledMetricMeta>
            ) : (
              <StyledDeadlineList>
                {visibleDeadlines.map((deadline) => (
                  <StyledDeadlineRow key={deadline.id}>
                    <StyledDeadlineDate isOverdue={deadline.isOverdue}>
                      {formatBilanDate(deadline.deadline, locale)}
                    </StyledDeadlineDate>
                    <StyledDeadlineName>
                      {deadline.name?.trim() ||
                        i18n._(msg`Funding application`)}
                    </StyledDeadlineName>
                    <StyledDeadlineAmount>
                      {formatBilanMoney(
                        deadline.requestedMicros,
                        summary.currencyCode,
                        locale,
                      )}
                    </StyledDeadlineAmount>
                  </StyledDeadlineRow>
                ))}
              </StyledDeadlineList>
            )}
          </StyledColumn>
        </StyledLayout>
      )}
    </BilanPulseCard>
  );
};
