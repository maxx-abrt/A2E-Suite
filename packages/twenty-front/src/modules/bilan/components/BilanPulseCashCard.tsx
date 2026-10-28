import { styled } from '@linaria/react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useId, useMemo, useState } from 'react';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import {
  IconChartLine,
  IconTrendingDown,
  IconTrendingUp,
} from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  BilanPulseCard,
  BilanPulseDelta,
  BilanPulseEmptyState,
  BilanPulseErrorState,
  BilanPulseSegmented,
  BilanPulseSkeleton,
  type BilanPulseCardSpan,
  StyledBilanPulseLabel,
  StyledBilanPulseMetricRow,
  StyledBilanPulseValue,
} from '@/bilan/components/BilanPulseCard';
import { BilanPulseRadar } from '@/bilan/components/BilanPulseRadar';
import { BILAN_PULSE_PALETTE } from '@/bilan/constants/BilanPulsePalette';
import { useBilanPagedRecords } from '@/bilan/hooks/useBilanPagedRecords';
import { type BilanBookEntryRecord } from '@/bilan/types/BilanPulse';
import { buildBilanCashFlow } from '@/bilan/utils/buildBilanPulse';
import { buildBilanSmoothPath } from '@/bilan/utils/buildBilanSmoothPath';
import {
  formatBilanMoney,
  formatBilanMonthShort,
  formatBilanSignedMoney,
  getBilanLocale,
} from '@/bilan/utils/formatBilanPulse';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

const BILAN_CASH_FLOW_MONTHS = 6;

const BILAN_RHYTHM_MONTHS = 12;

const BILAN_BOOK_ENTRY_MAX_PAGES = 3;

const WAVE_WIDTH = 600;

const WAVE_HEIGHT = 180;

const WAVE_BASELINE = 90;

const WAVE_HALF_HEIGHT = 74;

type CashFlowView = 'flow' | 'rhythm';

const StyledLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledLegendItem = styled.span`
  align-items: center;
  color: ${BILAN_PULSE_PALETTE.onAccent.neutral};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledLegendDot = styled.i<{ tone: 'income' | 'expense' }>`
  background: ${({ tone }) =>
    tone === 'income'
      ? BILAN_PULSE_PALETTE.cashIncome
      : BILAN_PULSE_PALETTE.cashExpense};
  border-radius: ${themeCssVariables.border.radius.pill};
  display: inline-block;
  height: 7px;
  width: 7px;
`;

const StyledChartSurface = styled.div`
  background: ${BILAN_PULSE_PALETTE.glassSurface};
  border: 1px solid ${BILAN_PULSE_PALETTE.glassBorder};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin-top: auto;
  min-height: 0;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[3]}
    ${themeCssVariables.spacing[2]};
  position: relative;
`;

const StyledWavePlot = styled.div`
  height: 176px;
  position: relative;
`;

const StyledWaveSvg = styled.svg`
  display: block;
  height: 100%;
  width: 100%;
`;

const StyledWaveLine = styled.path`
  animation: bilan-wave-draw 1.25s cubic-bezier(0.3, 0.8, 0.2, 1) both;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;

  @keyframes bilan-wave-draw {
    to {
      stroke-dashoffset: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    stroke-dashoffset: 0;
  }
`;

const StyledWaveColumns = styled.div`
  display: flex;
  inset: 0;
  position: absolute;
`;

const StyledWaveColumn = styled.button`
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: default;
  flex: 1;
  min-width: 0;
  padding: 0;

  &:focus-visible {
    outline: 2px solid ${BILAN_PULSE_PALETTE.cashIncome};
    outline-offset: -2px;
  }
`;

const StyledWaveHoverLine = styled.span`
  background: ${BILAN_PULSE_PALETTE.waveHover};
  bottom: 0;
  pointer-events: none;
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  width: 1px;
`;

const StyledWaveDot = styled.span<{ tone: 'income' | 'expense' }>`
  background: ${({ tone }) =>
    tone === 'income'
      ? BILAN_PULSE_PALETTE.cashIncome
      : BILAN_PULSE_PALETTE.cashExpense};
  border: 2px solid ${BILAN_PULSE_PALETTE.waveDotBorder};
  border-radius: 50%;
  height: 8px;
  pointer-events: none;
  position: absolute;
  transform: translate(-50%, -50%);
  width: 8px;
`;

const StyledWaveAxis = styled.div`
  display: flex;
  width: 100%;
`;

const StyledWaveAxisLabel = styled.span`
  color: ${BILAN_PULSE_PALETTE.onAccent.neutral};
  flex: 1;
  font-size: ${themeCssVariables.font.size.xs};
  text-align: center;
  white-space: nowrap;
`;

const StyledWaveTooltip = styled.div`
  background: ${BILAN_PULSE_PALETTE.cream};
  border: 1px solid ${BILAN_PULSE_PALETTE.tooltipInkBorder};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${BILAN_PULSE_PALETTE.tooltipShadow};
  color: ${BILAN_PULSE_PALETTE.tooltipInk};
  display: flex;
  flex-direction: column;
  gap: 2px;
  left: 50%;
  min-width: 156px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  pointer-events: none;
  position: absolute;
  top: 6px;
  transform: translateX(-50%);
  z-index: 2;
`;

const StyledWaveTooltipTitle = styled.span`
  color: ${BILAN_PULSE_PALETTE.tooltipInkMuted};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin-bottom: 2px;
`;

const StyledWaveTooltipRow = styled.span`
  align-items: center;
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  white-space: nowrap;
`;

const StyledWaveTooltipLabel = styled.span`
  align-items: center;
  color: ${BILAN_PULSE_PALETTE.tooltipInkMuted};
  display: inline-flex;
  gap: 5px;
`;

const StyledWaveTooltipValue = styled.span`
  color: ${BILAN_PULSE_PALETTE.tooltipInk};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledRhythmPanel = styled.div`
  background: ${BILAN_PULSE_PALETTE.glassSurfaceSoft};
  border: 1px solid ${BILAN_PULSE_PALETTE.glassBorderSoft};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledRhythmCaption = styled.div`
  align-items: baseline;
  color: ${BILAN_PULSE_PALETTE.onAccent.neutral};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  justify-content: space-between;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const StyledRhythmLayout = styled.div`
  align-items: center;
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);

  @media (max-width: 620px) {
    align-items: stretch;
    grid-template-columns: 1fr;
  }
`;

const StyledRhythmStats = styled.div`
  border-left: 1px solid ${BILAN_PULSE_PALETTE.glassBorderSoft};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding-left: ${themeCssVariables.spacing[4]};

  @media (max-width: 620px) {
    border-left: none;
    border-top: 1px solid ${BILAN_PULSE_PALETTE.glassBorderSoft};
    display: grid;
    gap: ${themeCssVariables.spacing[3]};
    grid-template-columns: 1fr 1fr;
    padding-left: 0;
    padding-top: ${themeCssVariables.spacing[3]};
  }
`;

const StyledRhythmStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledRhythmStatLabel = styled.span`
  color: ${BILAN_PULSE_PALETTE.onAccent.neutral};
  font-size: ${themeCssVariables.font.size.xs};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const StyledRhythmStatValue = styled.span`
  color: ${BILAN_PULSE_PALETTE.cream};
  font-size: ${themeCssVariables.font.size.lg};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: -0.03em;
`;

const StyledRhythmStatMeta = styled.span`
  color: ${BILAN_PULSE_PALETTE.onAccent.neutral};
  font-size: ${themeCssVariables.font.size.xs};
`;

type BilanPulseCashCardProps = {
  span: BilanPulseCardSpan;
  transactionsPath: string;
};

export const BilanPulseCashCard = ({
  span,
  transactionsPath,
}: BilanPulseCashCardProps) => {
  const { i18n } = useLingui();
  const locale = getBilanLocale(i18n.locale);
  const now = useMemo(() => new Date(), []);
  const gradientId = useId().replace(/:/g, '');
  const [view, setView] = useState<CashFlowView>('flow');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(
    null,
  );
  const { objectMetadataItem, records, loading, error, refetch } =
    useBilanPagedRecords<BilanBookEntryRecord & ObjectRecord>({
      objectNameSingular: 'bookEntry',
      orderBy: [{ entryDate: 'DescNullsLast' }],
      maxPages: BILAN_BOOK_ENTRY_MAX_PAGES,
      recordGqlFields: {
        id: true,
        label: true,
        entryDate: true,
        entryType: true,
        amount: true,
        sourceKind: true,
      },
    });
  const summary = useMemo(
    () =>
      buildBilanCashFlow(
        records as unknown as BilanBookEntryRecord[],
        now,
        BILAN_RHYTHM_MONTHS,
      ),
    [records, now],
  );
  const flowMonths = summary.months.slice(-BILAN_CASH_FLOW_MONTHS);
  const bookPath = getAppPath(AppPath.RecordIndexPage, {
    objectNamePlural: objectMetadataItem.namePlural,
  });
  const previousMonthIndex = summary.months.length - 2;
  const previousMonthLabel =
    previousMonthIndex >= 0
      ? formatBilanMonthShort(
          summary.months[previousMonthIndex]?.monthStart ?? '',
          locale,
        )
      : '';
  const deltaMicros =
    summary.currentMonthNetMicros - summary.previousMonthNetMicros;
  const comparisonLabel =
    previousMonthLabel === '' ? '' : i18n._(msg`vs ${previousMonthLabel}`);
  const maxMicros = Math.max(
    1,
    ...flowMonths.flatMap((month) => [month.incomeMicros, month.expenseMicros]),
  );
  const incomePoints = flowMonths.map((month, index) => ({
    x: ((index + 0.5) / flowMonths.length) * WAVE_WIDTH,
    y: WAVE_BASELINE - (month.incomeMicros / maxMicros) * WAVE_HALF_HEIGHT,
  }));
  const expensePoints = flowMonths.map((month, index) => ({
    x: ((index + 0.5) / flowMonths.length) * WAVE_WIDTH,
    y: WAVE_BASELINE + (month.expenseMicros / maxMicros) * WAVE_HALF_HEIGHT,
  }));
  const incomePath = buildBilanSmoothPath(incomePoints);
  const expensePath = buildBilanSmoothPath(expensePoints);
  const firstWaveX = incomePoints[0]?.x ?? 0;
  const lastWaveX = incomePoints.at(-1)?.x ?? 0;
  const incomeAreaPath = `${incomePath} L${lastWaveX},${WAVE_BASELINE} L${firstWaveX},${WAVE_BASELINE} Z`;
  const expenseAreaPath = `${expensePath} L${lastWaveX},${WAVE_BASELINE} L${firstWaveX},${WAVE_BASELINE} Z`;
  const activeMonthIndex = hoveredMonthIndex ?? flowMonths.length - 1;
  const activeMonth = flowMonths[activeMonthIndex];
  const activeIncomePoint = incomePoints[activeMonthIndex];
  const activeExpensePoint = expensePoints[activeMonthIndex];
  const incomeTotal = summary.months.reduce(
    (total, month) => total + month.incomeMicros,
    0,
  );
  const bestMonthIndex = summary.months.reduce(
    (bestIndex, month, index, months) =>
      month.incomeMicros > (months[bestIndex]?.incomeMicros ?? 0)
        ? index
        : bestIndex,
    0,
  );
  const bestMonth = summary.months[bestMonthIndex];
  const averageIncomeMicros =
    summary.months.length > 0 ? incomeTotal / summary.months.length : 0;

  return (
    <BilanPulseCard
      title={i18n._(msg`Cash flow`)}
      Icon={IconChartLine}
      span={span}
      tone="ocean"
      meta={
        <BilanPulseSegmented
          ariaLabel={i18n._(msg`Cash flow period`)}
          items={[
            { label: i18n._(msg`6M`), value: 'flow' },
            { label: i18n._(msg`12M`), value: 'rhythm' },
          ]}
          value={view}
          onChange={(nextView) =>
            setView(nextView === 'rhythm' ? 'rhythm' : 'flow')
          }
        />
      }
      action={{ label: i18n._(msg`Open book`), to: bookPath }}
      testId="bilan-cash-card"
    >
      {loading && records.length === 0 ? (
        <BilanPulseSkeleton />
      ) : error ? (
        <BilanPulseErrorState
          message={i18n._(msg`Cash flow could not load.`)}
          retryLabel={i18n._(msg`Retry cash flow`)}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : summary.entryCount === 0 ? (
        <BilanPulseEmptyState
          title={i18n._(msg`No cash movements yet`)}
          description={i18n._(
            msg`Recorded income and expenses will appear here as a monthly pulse.`,
          )}
          action={
            transactionsPath === '' ? undefined : (
              <Button
                title={i18n._(msg`Record a transaction`)}
                ariaLabel={i18n._(msg`Record a transaction`)}
                size="small"
                variant="secondary"
                to={transactionsPath}
              />
            )
          }
        />
      ) : view === 'flow' ? (
        <>
          <StyledBilanPulseMetricRow>
            <div>
              <StyledBilanPulseLabel>
                {i18n._(msg`Net this month`)}
              </StyledBilanPulseLabel>
              <StyledBilanPulseValue>
                {formatBilanMoney(
                  summary.currentMonthNetMicros,
                  summary.currencyCode,
                  locale,
                )}
              </StyledBilanPulseValue>
            </div>
            <BilanPulseDelta
              tone={deltaMicros >= 0 ? 'positive' : 'negative'}
              variant="onAccent"
              Icon={deltaMicros >= 0 ? IconTrendingUp : IconTrendingDown}
              label={`${formatBilanSignedMoney(
                deltaMicros,
                summary.currencyCode,
                locale,
              )}${comparisonLabel === '' ? '' : ` ${comparisonLabel}`}`}
            />
          </StyledBilanPulseMetricRow>
          <StyledLegend>
            <StyledLegendItem>
              <StyledLegendDot tone="income" />
              {i18n._(msg`Income`)}{' '}
              {formatBilanMoney(
                summary.currentMonthIncomeMicros,
                summary.currencyCode,
                locale,
              )}
            </StyledLegendItem>
            <StyledLegendItem>
              <StyledLegendDot tone="expense" />
              {i18n._(msg`Expenses`)}{' '}
              {formatBilanMoney(
                summary.currentMonthExpenseMicros,
                summary.currencyCode,
                locale,
              )}
            </StyledLegendItem>
          </StyledLegend>
          <StyledChartSurface>
            <StyledWavePlot onPointerLeave={() => setHoveredMonthIndex(null)}>
              <StyledWaveSvg
                viewBox={`0 0 ${WAVE_WIDTH} ${WAVE_HEIGHT}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={i18n._(
                  msg`Monthly cash flow: income above, expenses below`,
                )}
              >
                <defs>
                  <linearGradient
                    id={`${gradientId}-income-line`}
                    x1="0"
                    x2="1"
                    y1="0"
                    y2="0"
                  >
                    <stop
                      offset="0"
                      style={{ stopColor: BILAN_PULSE_PALETTE.cashIncome }}
                    />
                    <stop
                      offset="1"
                      style={{
                        stopColor: BILAN_PULSE_PALETTE.cashIncome,
                        stopOpacity: 0.75,
                      }}
                    />
                  </linearGradient>
                  <linearGradient
                    id={`${gradientId}-expense-line`}
                    x1="0"
                    x2="1"
                    y1="0"
                    y2="0"
                  >
                    <stop
                      offset="0"
                      style={{ stopColor: BILAN_PULSE_PALETTE.cashExpense }}
                    />
                    <stop
                      offset="1"
                      style={{
                        stopColor: BILAN_PULSE_PALETTE.cashExpense,
                        stopOpacity: 0.78,
                      }}
                    />
                  </linearGradient>
                  <linearGradient
                    id={`${gradientId}-income-area`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="0"
                      style={{
                        stopColor: BILAN_PULSE_PALETTE.cashIncome,
                        stopOpacity: 0.18,
                      }}
                    />
                    <stop
                      offset="1"
                      style={{
                        stopColor: BILAN_PULSE_PALETTE.cashIncome,
                        stopOpacity: 0,
                      }}
                    />
                  </linearGradient>
                  <linearGradient
                    id={`${gradientId}-expense-area`}
                    x1="0"
                    x2="0"
                    y1="1"
                    y2="0"
                  >
                    <stop
                      offset="0"
                      style={{
                        stopColor: BILAN_PULSE_PALETTE.cashExpense,
                        stopOpacity: 0.16,
                      }}
                    />
                    <stop
                      offset="1"
                      style={{
                        stopColor: BILAN_PULSE_PALETTE.cashExpense,
                        stopOpacity: 0,
                      }}
                    />
                  </linearGradient>
                </defs>
                <line
                  x1={0}
                  x2={WAVE_WIDTH}
                  y1={WAVE_BASELINE * 0.28}
                  y2={WAVE_BASELINE * 0.28}
                  stroke={BILAN_PULSE_PALETTE.waveGrid}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={0}
                  x2={WAVE_WIDTH}
                  y1={WAVE_BASELINE}
                  y2={WAVE_BASELINE}
                  stroke={BILAN_PULSE_PALETTE.waveBaseline}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={0}
                  x2={WAVE_WIDTH}
                  y1={WAVE_BASELINE * 1.72}
                  y2={WAVE_BASELINE * 1.72}
                  stroke={BILAN_PULSE_PALETTE.waveGrid}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={incomeAreaPath}
                  fill={`url(#${gradientId}-income-area)`}
                />
                <path
                  d={expenseAreaPath}
                  fill={`url(#${gradientId}-expense-area)`}
                />
                <StyledWaveLine
                  d={incomePath}
                  pathLength={1}
                  fill="none"
                  stroke={`url(#${gradientId}-income-line)`}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                <StyledWaveLine
                  d={expensePath}
                  pathLength={1}
                  fill="none"
                  stroke={`url(#${gradientId}-expense-line)`}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </StyledWaveSvg>
              {activeMonth !== undefined &&
                activeIncomePoint !== undefined &&
                activeExpensePoint !== undefined && (
                  <>
                    {hoveredMonthIndex !== null && (
                      <StyledWaveHoverLine
                        style={{
                          left: `${((hoveredMonthIndex + 0.5) / flowMonths.length) * 100}%`,
                        }}
                      />
                    )}
                    <StyledWaveDot
                      tone="income"
                      style={{
                        left: `${((activeMonthIndex + 0.5) / flowMonths.length) * 100}%`,
                        top: `${(activeIncomePoint.y / WAVE_HEIGHT) * 100}%`,
                      }}
                    />
                    <StyledWaveDot
                      tone="expense"
                      style={{
                        left: `${((activeMonthIndex + 0.5) / flowMonths.length) * 100}%`,
                        top: `${(activeExpensePoint.y / WAVE_HEIGHT) * 100}%`,
                      }}
                    />
                  </>
                )}
              <StyledWaveColumns>
                {flowMonths.map((month, index) => {
                  const monthLabel = formatBilanMonthShort(
                    month.monthStart,
                    locale,
                  );

                  return (
                    <StyledWaveColumn
                      key={month.key}
                      type="button"
                      aria-label={`${monthLabel}: ${i18n._(msg`income`)} ${formatBilanMoney(
                        month.incomeMicros,
                        summary.currencyCode,
                        locale,
                      )}, ${i18n._(msg`expenses`)} ${formatBilanMoney(
                        month.expenseMicros,
                        summary.currencyCode,
                        locale,
                      )}`}
                      onFocus={() => setHoveredMonthIndex(index)}
                      onBlur={() => setHoveredMonthIndex(null)}
                      onPointerEnter={() => setHoveredMonthIndex(index)}
                    />
                  );
                })}
              </StyledWaveColumns>
              {hoveredMonthIndex !== null &&
                flowMonths[hoveredMonthIndex] !== undefined && (
                  <StyledWaveTooltip>
                    <StyledWaveTooltipTitle>
                      {formatBilanMonthShort(
                        flowMonths[hoveredMonthIndex].monthStart,
                        locale,
                      )}
                    </StyledWaveTooltipTitle>
                    <StyledWaveTooltipRow>
                      <StyledWaveTooltipLabel>
                        <StyledLegendDot tone="income" />
                        {i18n._(msg`Income`)}
                      </StyledWaveTooltipLabel>
                      <StyledWaveTooltipValue>
                        {formatBilanMoney(
                          flowMonths[hoveredMonthIndex].incomeMicros,
                          summary.currencyCode,
                          locale,
                        )}
                      </StyledWaveTooltipValue>
                    </StyledWaveTooltipRow>
                    <StyledWaveTooltipRow>
                      <StyledWaveTooltipLabel>
                        <StyledLegendDot tone="expense" />
                        {i18n._(msg`Expenses`)}
                      </StyledWaveTooltipLabel>
                      <StyledWaveTooltipValue>
                        {formatBilanMoney(
                          flowMonths[hoveredMonthIndex].expenseMicros,
                          summary.currencyCode,
                          locale,
                        )}
                      </StyledWaveTooltipValue>
                    </StyledWaveTooltipRow>
                    <StyledWaveTooltipRow>
                      <StyledWaveTooltipLabel>
                        {i18n._(msg`Net`)}
                      </StyledWaveTooltipLabel>
                      <StyledWaveTooltipValue>
                        {formatBilanMoney(
                          flowMonths[hoveredMonthIndex].netMicros,
                          summary.currencyCode,
                          locale,
                        )}
                      </StyledWaveTooltipValue>
                    </StyledWaveTooltipRow>
                  </StyledWaveTooltip>
                )}
            </StyledWavePlot>
            <StyledWaveAxis>
              {flowMonths.map((month) => (
                <StyledWaveAxisLabel key={month.key}>
                  {formatBilanMonthShort(month.monthStart, locale)}
                </StyledWaveAxisLabel>
              ))}
            </StyledWaveAxis>
          </StyledChartSurface>
        </>
      ) : incomeTotal === 0 ? (
        <BilanPulseEmptyState
          title={i18n._(msg`No income in the last 12 months`)}
          description={i18n._(
            msg`Recorded income will draw a rolling seasonality map here.`,
          )}
        />
      ) : (
        <StyledRhythmPanel>
          <StyledRhythmCaption>
            <span>{i18n._(msg`Income by month`)}</span>
            <span>{i18n._(msg`Rolling 12 months`)}</span>
          </StyledRhythmCaption>
          <StyledRhythmLayout>
            <BilanPulseRadar
              values={summary.months.map((month) => month.incomeMicros)}
              labels={summary.months.map((month) =>
                formatBilanMonthShort(month.monthStart, locale),
              )}
              currencyCode={summary.currencyCode}
              locale={locale}
              ariaLabel={i18n._(msg`Income by month over the last 12 months`)}
            />
            <StyledRhythmStats>
              <StyledRhythmStat>
                <StyledRhythmStatLabel>
                  {i18n._(msg`Best month`)}
                </StyledRhythmStatLabel>
                <StyledRhythmStatValue>
                  {formatBilanMoney(
                    bestMonth?.incomeMicros ?? 0,
                    summary.currencyCode,
                    locale,
                  )}
                </StyledRhythmStatValue>
                <StyledRhythmStatMeta>
                  {bestMonth === undefined
                    ? ''
                    : formatBilanMonthShort(bestMonth.monthStart, locale)}
                </StyledRhythmStatMeta>
              </StyledRhythmStat>
              <StyledRhythmStat>
                <StyledRhythmStatLabel>
                  {i18n._(msg`Monthly average`)}
                </StyledRhythmStatLabel>
                <StyledRhythmStatValue>
                  {formatBilanMoney(
                    averageIncomeMicros,
                    summary.currencyCode,
                    locale,
                  )}
                </StyledRhythmStatValue>
                <StyledRhythmStatMeta>
                  {i18n._(msg`per month`)}
                </StyledRhythmStatMeta>
              </StyledRhythmStat>
              <StyledRhythmStat>
                <StyledRhythmStatLabel>
                  {i18n._(msg`Total`)}
                </StyledRhythmStatLabel>
                <StyledRhythmStatValue>
                  {formatBilanMoney(incomeTotal, summary.currencyCode, locale)}
                </StyledRhythmStatValue>
                <StyledRhythmStatMeta>
                  {i18n._(msg`12 months`)}
                </StyledRhythmStatMeta>
              </StyledRhythmStat>
            </StyledRhythmStats>
          </StyledRhythmLayout>
        </StyledRhythmPanel>
      )}
    </BilanPulseCard>
  );
};
