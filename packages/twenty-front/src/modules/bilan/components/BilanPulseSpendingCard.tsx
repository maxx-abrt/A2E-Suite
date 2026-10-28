import { styled } from '@linaria/react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import {
  IconArrowUpRight,
  IconChartPie,
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
  BilanPulseSkeleton,
  type BilanPulseCardSpan,
  StyledBilanPulseLabel,
  StyledBilanPulseMetricRow,
  StyledBilanPulseValue,
} from '@/bilan/components/BilanPulseCard';
import { BilanPulseTreemap } from '@/bilan/components/BilanPulseTreemap';
import { useBilanPagedRecords } from '@/bilan/hooks/useBilanPagedRecords';
import { type BilanFinanceEntryRecord } from '@/bilan/types/BilanPulse';
import { buildBilanSpending } from '@/bilan/utils/buildBilanPulse';
import {
  formatBilanMoney,
  formatBilanPercent,
  getBilanLocale,
} from '@/bilan/utils/formatBilanPulse';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

const BILAN_FINANCE_ENTRY_MAX_PAGES = 2;

const BILAN_TREEMAP_CATEGORY_COUNT = 8;

const StyledFooterLink = styled(Link)`
  align-items: center;
  align-self: flex-start;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  text-decoration: none;

  &:hover {
    color: ${themeCssVariables.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

type BilanPulseSpendingCardProps = {
  span: BilanPulseCardSpan;
  transactionsPath: string;
};

export const BilanPulseSpendingCard = ({
  span,
  transactionsPath,
}: BilanPulseSpendingCardProps) => {
  const { i18n } = useLingui();
  const locale = getBilanLocale(i18n.locale);
  const now = useMemo(() => new Date(), []);
  const { objectMetadataItem, records, loading, error, refetch } =
    useBilanPagedRecords<BilanFinanceEntryRecord & ObjectRecord>({
      objectNameSingular: 'financeEntry',
      orderBy: [{ entryDate: 'DescNullsLast' }],
      maxPages: BILAN_FINANCE_ENTRY_MAX_PAGES,
      recordGqlFields: {
        id: true,
        label: true,
        entryType: true,
        entryDate: true,
        amount: true,
        category: {
          id: true,
          name: true,
        },
      },
    });
  const summary = useMemo(
    () =>
      buildBilanSpending(records as unknown as BilanFinanceEntryRecord[], now),
    [records, now],
  );
  const transactionsMetadataPath =
    objectMetadataItem === undefined
      ? transactionsPath
      : getAppPath(AppPath.RecordIndexPage, {
          objectNamePlural: objectMetadataItem.namePlural,
        });
  const topCategories = summary.categories.slice(
    0,
    BILAN_TREEMAP_CATEGORY_COUNT,
  );
  const otherCategories = summary.categories.slice(
    BILAN_TREEMAP_CATEGORY_COUNT,
  );
  const otherMicros = otherCategories.reduce(
    (total, category) => total + category.amountMicros,
    0,
  );
  const displayCategories =
    otherMicros > 0
      ? [
          ...topCategories,
          {
            id: 'other',
            name: i18n._(msg`Other`),
            amountMicros: otherMicros,
            entryCount: otherCategories.reduce(
              (total, category) => total + category.entryCount,
              0,
            ),
          },
        ]
      : topCategories;
  const spentDelta =
    summary.currentMonthExpenseMicros - summary.previousMonthExpenseMicros;
  const deltaTone =
    summary.previousMonthExpenseMicros === 0
      ? 'neutral'
      : spentDelta === 0
        ? 'neutral'
        : spentDelta < 0
          ? 'positive'
          : 'negative';
  const deltaPercent =
    summary.previousMonthExpenseMicros > 0
      ? (Math.abs(spentDelta) / summary.previousMonthExpenseMicros) * 100
      : 0;
  const deltaLabel =
    summary.previousMonthExpenseMicros === 0
      ? i18n._(msg`No expenses last month`)
      : spentDelta === 0
        ? i18n._(msg`Same as last month`)
        : spentDelta < 0
          ? i18n._(
              msg`${formatBilanPercent(deltaPercent, locale)} less than last month`,
            )
          : i18n._(
              msg`${formatBilanPercent(deltaPercent, locale)} more than last month`,
            );
  const uncategorizedLabel =
    summary.uncategorizedCount === 1
      ? i18n._(msg`1 transaction needs a category`)
      : i18n._(msg`${summary.uncategorizedCount} transactions need a category`);

  return (
    <BilanPulseCard
      title={i18n._(msg`Spending`)}
      Icon={IconChartPie}
      span={span}
      meta={i18n._(msg`This month`)}
      action={{
        label: i18n._(msg`Open transactions`),
        to: transactionsMetadataPath,
      }}
      testId="bilan-spending-card"
    >
      {loading && records.length === 0 ? (
        <BilanPulseSkeleton />
      ) : error ? (
        <BilanPulseErrorState
          message={i18n._(msg`Spending could not load.`)}
          retryLabel={i18n._(msg`Retry spending`)}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : summary.expenseCount === 0 ? (
        <BilanPulseEmptyState
          title={i18n._(msg`No expenses this month`)}
          description={i18n._(
            msg`Record an expense to see where your money goes.`,
          )}
          action={
            <Button
              title={i18n._(msg`Record an expense`)}
              ariaLabel={i18n._(msg`Record an expense`)}
              size="small"
              variant="secondary"
              to={transactionsMetadataPath}
            />
          }
        />
      ) : (
        <>
          <StyledBilanPulseMetricRow>
            <div>
              <StyledBilanPulseLabel>
                {i18n._(msg`Spent this month`)}
              </StyledBilanPulseLabel>
              <StyledBilanPulseValue>
                {formatBilanMoney(
                  summary.currentMonthExpenseMicros,
                  summary.currencyCode,
                  locale,
                )}
              </StyledBilanPulseValue>
            </div>
            <BilanPulseDelta
              tone={deltaTone}
              Icon={
                deltaTone === 'positive'
                  ? IconTrendingDown
                  : deltaTone === 'negative'
                    ? IconTrendingUp
                    : undefined
              }
              label={deltaLabel}
            />
          </StyledBilanPulseMetricRow>
          <BilanPulseTreemap
            categories={displayCategories}
            currencyCode={summary.currencyCode}
            locale={locale}
          />
          {summary.uncategorizedCount > 0 && (
            <StyledFooterLink to={transactionsMetadataPath}>
              {uncategorizedLabel}
              <IconArrowUpRight size={12} aria-hidden />
            </StyledFooterLink>
          )}
        </>
      )}
    </BilanPulseCard>
  );
};
