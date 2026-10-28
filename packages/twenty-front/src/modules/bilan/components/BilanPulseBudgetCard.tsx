import { styled } from '@linaria/react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { IconTargetArrow } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  BilanPulseCard,
  BilanPulseDelta,
  BilanPulseEmptyState,
  BilanPulseErrorState,
  BilanPulseSkeleton,
  type BilanPulseCardSpan,
} from '@/bilan/components/BilanPulseCard';
import { BILAN_PULSE_PALETTE } from '@/bilan/constants/BilanPulsePalette';
import { useBilanPagedRecords } from '@/bilan/hooks/useBilanPagedRecords';
import { type BilanBudgetRecord } from '@/bilan/types/BilanPulse';
import { buildBilanBudgets } from '@/bilan/utils/buildBilanPulse';
import {
  formatBilanDateTime,
  formatBilanMoney,
  formatBilanPercent,
  getBilanLocale,
} from '@/bilan/utils/formatBilanPulse';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

const BILAN_BUDGET_MAX_PAGES = 1;

const BILAN_VISIBLE_BUDGET_COUNT = 3;

const BILAN_GAUGE_TICK_COUNT = 60;

const StyledGauge = styled.div`
  margin: 0 auto;
  max-width: 360px;
  position: relative;
  width: 100%;
`;

const StyledGaugeValue = styled.span`
  bottom: 30px;
  color: ${BILAN_PULSE_PALETTE.cream};
  font-size: clamp(36px, 4vw, 46px);
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
  left: 50%;
  letter-spacing: -0.05em;
  line-height: 1;
  position: absolute;
  transform: translateX(-50%);
`;

const StyledGaugeLabel = styled.span`
  bottom: 13px;
  color: ${BILAN_PULSE_PALETTE.onAccent.neutral};
  font-size: ${themeCssVariables.font.size.xs};
  left: 50%;
  letter-spacing: 0.08em;
  position: absolute;
  text-transform: uppercase;
  transform: translateX(-50%);
`;

const StyledGaugeMeta = styled.div`
  align-items: center;
  color: ${BILAN_PULSE_PALETTE.onAccent.neutral};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  justify-content: center;
  margin-top: -${themeCssVariables.spacing[2]};
  text-align: center;
`;

const StyledBudgetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledBudgetRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledBudgetHeader = styled.div`
  align-items: baseline;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledBudgetName = styled.span`
  color: ${BILAN_PULSE_PALETTE.creamMedium};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledBudgetPercent = styled.span<{
  tone: 'positive' | 'warning' | 'negative';
}>`
  color: ${({ tone }) => {
    if (tone === 'negative') {
      return BILAN_PULSE_PALETTE.gauge.over;
    }

    if (tone === 'warning') {
      return BILAN_PULSE_PALETTE.gauge.warning;
    }

    return BILAN_PULSE_PALETTE.gauge.onTrack;
  }};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledProgressTrack = styled.div`
  background: ${BILAN_PULSE_PALETTE.progressTrack};
  border-radius: ${themeCssVariables.border.radius.pill};
  height: 5px;
  overflow: hidden;
  width: 100%;
`;

const StyledProgressFill = styled.div<{
  tone: 'positive' | 'warning' | 'negative';
}>`
  background: ${({ tone }) => {
    if (tone === 'negative') {
      return BILAN_PULSE_PALETTE.gauge.over;
    }

    if (tone === 'warning') {
      return BILAN_PULSE_PALETTE.gauge.warning;
    }

    return BILAN_PULSE_PALETTE.gauge.onTrack;
  }};
  border-radius: ${themeCssVariables.border.radius.pill};
  height: 100%;
`;

const StyledFootnote = styled.span`
  color: ${BILAN_PULSE_PALETTE.onAccent.neutral};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
`;

type BudgetTone = 'positive' | 'warning' | 'negative';

const getBudgetTone = (consumedPercent: number): BudgetTone => {
  if (consumedPercent >= 100) {
    return 'negative';
  }

  if (consumedPercent >= 80) {
    return 'warning';
  }

  return 'positive';
};

const getGaugeColor = (tone: BudgetTone): string => {
  if (tone === 'negative') {
    return BILAN_PULSE_PALETTE.gauge.over;
  }

  if (tone === 'warning') {
    return BILAN_PULSE_PALETTE.gauge.warning;
  }

  return BILAN_PULSE_PALETTE.gauge.onTrack;
};

type BilanPulseBudgetCardProps = {
  span: BilanPulseCardSpan;
};

export const BilanPulseBudgetCard = ({ span }: BilanPulseBudgetCardProps) => {
  const { i18n } = useLingui();
  const locale = getBilanLocale(i18n.locale);
  const now = useMemo(() => new Date(), []);
  const { objectMetadataItem, records, loading, error, refetch } =
    useBilanPagedRecords<BilanBudgetRecord & ObjectRecord>({
      objectNameSingular: 'budget',
      orderBy: [{ name: 'AscNullsFirst' }],
      maxPages: BILAN_BUDGET_MAX_PAGES,
      recordGqlFields: {
        id: true,
        name: true,
        amount: true,
        spentAmount: true,
        spentPercent: true,
        alertLevel: true,
        period: true,
        startDate: true,
        endDate: true,
        lastRollupAt: true,
      },
    });
  const summary = useMemo(
    () => buildBilanBudgets(records as unknown as BilanBudgetRecord[], now),
    [records, now],
  );
  const budgetsPath = getAppPath(AppPath.RecordIndexPage, {
    objectNamePlural: objectMetadataItem.namePlural,
  });
  const consumedPercent = Math.max(0, summary.consumedPercent);
  const overallTone = getBudgetTone(consumedPercent);
  const gaugeColor = getGaugeColor(overallTone);
  const filledTickCount = Math.round(
    (Math.min(100, consumedPercent) / 100) * BILAN_GAUGE_TICK_COUNT,
  );
  const statusLabel =
    summary.overBudgetCount > 0
      ? i18n._(msg`${summary.overBudgetCount} over budget`)
      : summary.warningCount > 0
        ? i18n._(msg`${summary.warningCount} near limit`)
        : i18n._(msg`On track`);
  const statusTone =
    summary.overBudgetCount > 0
      ? 'negative'
      : summary.warningCount > 0
        ? 'warning'
        : 'positive';

  return (
    <BilanPulseCard
      title={i18n._(msg`Budgets`)}
      Icon={IconTargetArrow}
      span={span}
      tone="ink"
      meta={i18n._(msg`Active envelopes`)}
      action={{ label: i18n._(msg`Open budgets`), to: budgetsPath }}
      testId="bilan-budget-card"
    >
      {loading && records.length === 0 ? (
        <BilanPulseSkeleton />
      ) : error ? (
        <BilanPulseErrorState
          message={i18n._(msg`Budgets could not load.`)}
          retryLabel={i18n._(msg`Retry budgets`)}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : summary.rows.length === 0 ? (
        <BilanPulseEmptyState
          title={i18n._(msg`No active budget`)}
          description={i18n._(
            msg`Give an expense category an envelope to watch it before it overruns.`,
          )}
          action={
            <Button
              title={i18n._(msg`Open budgets`)}
              ariaLabel={i18n._(msg`Open budgets`)}
              size="small"
              variant="secondary"
              to={budgetsPath}
            />
          }
        />
      ) : (
        <>
          <StyledGauge
            role="img"
            aria-label={i18n._(
              msg`${formatBilanPercent(consumedPercent, locale)} of budgets consumed`,
            )}
          >
            <svg width="100%" viewBox="0 0 340 190">
              {Array.from({ length: BILAN_GAUGE_TICK_COUNT }, (_, index) => {
                const ratio = index / (BILAN_GAUGE_TICK_COUNT - 1);
                const angle = Math.PI + ratio * Math.PI;
                const isActive = index < filledTickCount;
                const outerRadius = index % 5 === 0 ? 146 : 138;
                const innerX = 170 + Math.cos(angle) * 122;
                const innerY = 170 + Math.sin(angle) * 122;
                const outerX = 170 + Math.cos(angle) * outerRadius;
                const outerY = 170 + Math.sin(angle) * outerRadius;

                return (
                  <line
                    key={index}
                    x1={innerX}
                    y1={innerY}
                    x2={outerX}
                    y2={outerY}
                    stroke={
                      isActive ? gaugeColor : BILAN_PULSE_PALETTE.gaugeInactive
                    }
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                );
              })}
              <circle
                cx={170 + Math.cos(Math.PI * 1.8) * 154}
                cy={170 + Math.sin(Math.PI * 1.8) * 154}
                r={2.5}
                fill={BILAN_PULSE_PALETTE.gaugeThreshold}
              />
            </svg>
            <StyledGaugeValue>
              {formatBilanPercent(consumedPercent, locale)}
            </StyledGaugeValue>
            <StyledGaugeLabel>{i18n._(msg`consumed`)}</StyledGaugeLabel>
          </StyledGauge>
          <StyledGaugeMeta>
            <span>
              {i18n._(msg`Spent`)}{' '}
              {formatBilanMoney(
                summary.totalSpentMicros,
                summary.currencyCode,
                locale,
              )}{' '}
              {i18n._(msg`of`)}{' '}
              {formatBilanMoney(
                summary.totalBudgetMicros,
                summary.currencyCode,
                locale,
              )}
            </span>
            <BilanPulseDelta
              tone={statusTone}
              variant="onAccent"
              label={statusLabel}
            />
          </StyledGaugeMeta>
          <StyledBudgetList>
            {summary.rows.slice(0, BILAN_VISIBLE_BUDGET_COUNT).map((budget) => {
              const tone = getBudgetTone(budget.consumedPercent);
              const percent = Math.max(0, budget.consumedPercent);

              return (
                <StyledBudgetRow key={budget.id}>
                  <StyledBudgetHeader>
                    <StyledBudgetName>
                      {budget.name?.trim() || i18n._(msg`Budget`)}
                    </StyledBudgetName>
                    <StyledBudgetPercent tone={tone}>
                      {formatBilanPercent(percent, locale)}
                    </StyledBudgetPercent>
                  </StyledBudgetHeader>
                  <StyledProgressTrack>
                    <StyledProgressFill
                      tone={tone}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </StyledProgressTrack>
                </StyledBudgetRow>
              );
            })}
          </StyledBudgetList>
          <StyledFootnote>
            {summary.lastRollupAt === null
              ? i18n._(msg`Rolled up from your recorded movements.`)
              : i18n._(
                  msg`Updated ${formatBilanDateTime(summary.lastRollupAt, locale)}.`,
                )}
          </StyledFootnote>
        </>
      )}
    </BilanPulseCard>
  );
};
