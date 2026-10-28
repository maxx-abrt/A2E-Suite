import { styled } from '@linaria/react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { IconFileText } from 'twenty-ui/icon';
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
import { useBilanPagedRecords } from '@/bilan/hooks/useBilanPagedRecords';
import { type BilanInvoiceRecord } from '@/bilan/types/BilanPulse';
import { BILAN_PULSE_PALETTE } from '@/bilan/constants/BilanPulsePalette';
import { buildBilanReceivables } from '@/bilan/utils/buildBilanPulse';
import {
  formatBilanDate,
  formatBilanMoney,
  getBilanLocale,
} from '@/bilan/utils/formatBilanPulse';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';

const BILAN_INVOICE_MAX_PAGES = 2;

const BILAN_RECENT_OPEN_INVOICE_COUNT = 3;

const StyledSplitBar = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.pill};
  display: flex;
  height: 8px;
  overflow: hidden;
  width: 100%;
`;

const StyledSplitSegment = styled.span<{ tone: 'paid' | 'due' | 'overdue' }>`
  background: ${({ tone }) => {
    if (tone === 'paid') {
      return BILAN_PULSE_PALETTE.invoice.collected;
    }

    if (tone === 'overdue') {
      return BILAN_PULSE_PALETTE.invoice.overdue;
    }

    return BILAN_PULSE_PALETTE.invoice.due;
  }};
  display: block;
  height: 100%;
  min-width: ${({ tone }) => (tone === 'overdue' ? '3px' : '0')};
  opacity: ${({ tone }) => (tone === 'due' ? 0.55 : 1)};
`;

const StyledSplitLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  margin-top: ${themeCssVariables.spacing[1]};
`;

const StyledSplitLegendItem = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  white-space: nowrap;
`;

const StyledDot = styled.i<{ tone: 'paid' | 'due' | 'overdue' }>`
  background: ${({ tone }) => {
    if (tone === 'paid') {
      return BILAN_PULSE_PALETTE.invoice.collected;
    }

    if (tone === 'overdue') {
      return BILAN_PULSE_PALETTE.invoice.overdue;
    }

    return BILAN_PULSE_PALETTE.invoice.due;
  }};
  border-radius: ${themeCssVariables.border.radius.pill};
  display: inline-block;
  height: 7px;
  opacity: ${({ tone }) => (tone === 'due' ? 0.55 : 1)};
  width: 7px;
`;

const StyledInvoiceList = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledInvoiceRow = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]} 0;
  text-align: left;
  width: 100%;

  &:hover {
    color: ${themeCssVariables.font.color.primary};

    .bilan-invoice-title {
      color: ${themeCssVariables.color.blue};
    }
  }

  &:focus-visible {
    border-radius: ${themeCssVariables.border.radius.sm};
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

const StyledInvoiceIdentity = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledInvoiceTitle = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color calc(${themeCssVariables.animation.duration.fast} * 1s) ease;
  white-space: nowrap;
`;

const StyledInvoiceSubtitle = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledInvoiceAmount = styled.span`
  color: ${themeCssVariables.font.color.primary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledOverdueFlag = styled.span`
  color: ${BILAN_PULSE_PALETTE.invoice.overdue};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  white-space: nowrap;
`;

const StyledFootnote = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
`;

type BilanPulseReceivablesCardProps = {
  span: BilanPulseCardSpan;
};

export const BilanPulseReceivablesCard = ({
  span,
}: BilanPulseReceivablesCardProps) => {
  const { i18n } = useLingui();
  const locale = getBilanLocale(i18n.locale);
  const now = useMemo(() => new Date(), []);
  const { objectMetadataItem, records, loading, error, refetch } =
    useBilanPagedRecords<BilanInvoiceRecord & ObjectRecord>({
      objectNameSingular: 'invoice',
      orderBy: [{ dueDate: 'AscNullsLast' }],
      maxPages: BILAN_INVOICE_MAX_PAGES,
      recordGqlFields: {
        id: true,
        number: true,
        clientName: true,
        status: true,
        issueDate: true,
        dueDate: true,
        paidDate: true,
        amountTotal: true,
        amountPaid: true,
      },
    });
  const summary = useMemo(
    () =>
      buildBilanReceivables(records as unknown as BilanInvoiceRecord[], now),
    [records, now],
  );
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const invoicesPath = getAppPath(AppPath.RecordIndexPage, {
    objectNamePlural: objectMetadataItem.namePlural,
  });
  const safeOpenTotalMicros = Math.max(1, summary.openTotalMicros);
  const paidPercent = (summary.openPaidMicros / safeOpenTotalMicros) * 100;
  const overduePercent =
    (summary.overdueOutstandingMicros / safeOpenTotalMicros) * 100;
  const dueLaterPercent =
    (summary.dueLaterOutstandingMicros / safeOpenTotalMicros) * 100;
  const visibleInvoices = summary.openInvoices.slice(
    0,
    BILAN_RECENT_OPEN_INVOICE_COUNT,
  );

  return (
    <BilanPulseCard
      title={i18n._(msg`Invoices`)}
      Icon={IconFileText}
      span={span}
      meta={i18n._(msg`${summary.openCount} open`)}
      action={{ label: i18n._(msg`Open invoices`), to: invoicesPath }}
      testId="bilan-receivables-card"
    >
      {loading && records.length === 0 ? (
        <BilanPulseSkeleton />
      ) : error ? (
        <BilanPulseErrorState
          message={i18n._(msg`Receivables could not load.`)}
          retryLabel={i18n._(msg`Retry receivables`)}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : records.length === 0 ? (
        <BilanPulseEmptyState
          title={i18n._(msg`No invoices yet`)}
          description={i18n._(
            msg`Issue a first invoice to follow what clients still owe you.`,
          )}
          action={
            <Button
              title={i18n._(msg`Open invoices`)}
              ariaLabel={i18n._(msg`Open invoices`)}
              size="small"
              variant="secondary"
              to={invoicesPath}
            />
          }
        />
      ) : summary.openCount === 0 ? (
        <BilanPulseEmptyState
          title={i18n._(msg`Everything is settled`)}
          description={i18n._(msg`No open invoice is waiting for payment.`)}
          action={
            <Button
              title={i18n._(msg`Open invoices`)}
              ariaLabel={i18n._(msg`Open invoices`)}
              size="small"
              variant="secondary"
              to={invoicesPath}
            />
          }
        />
      ) : (
        <>
          <StyledBilanPulseMetricRow>
            <div>
              <StyledBilanPulseLabel>
                {i18n._(msg`Outstanding`)}
              </StyledBilanPulseLabel>
              <StyledBilanPulseValue>
                {formatBilanMoney(
                  summary.openOutstandingMicros,
                  summary.currencyCode,
                  locale,
                )}
              </StyledBilanPulseValue>
            </div>
            <BilanPulseDelta
              tone={summary.overdueCount > 0 ? 'negative' : 'positive'}
              label={
                summary.overdueCount > 0
                  ? i18n._(msg`${summary.overdueCount} overdue`)
                  : i18n._(msg`No overdue invoice`)
              }
            />
          </StyledBilanPulseMetricRow>
          <div>
            <StyledSplitBar
              role="img"
              aria-label={i18n._(
                msg`Share of open invoices paid, due later and overdue`,
              )}
            >
              {paidPercent > 0 && (
                <StyledSplitSegment
                  tone="paid"
                  style={{ width: `${paidPercent}%` }}
                  title={i18n._(msg`Collected`)}
                />
              )}
              {dueLaterPercent > 0 && (
                <StyledSplitSegment
                  tone="due"
                  style={{ width: `${dueLaterPercent}%` }}
                  title={i18n._(msg`Due later`)}
                />
              )}
              {overduePercent > 0 && (
                <StyledSplitSegment
                  tone="overdue"
                  style={{ width: `${overduePercent}%` }}
                  title={i18n._(msg`Overdue`)}
                />
              )}
            </StyledSplitBar>
            <StyledSplitLegend>
              <StyledSplitLegendItem>
                <StyledDot tone="paid" />
                {i18n._(msg`Collected`)}{' '}
                {formatBilanMoney(
                  summary.openPaidMicros,
                  summary.currencyCode,
                  locale,
                )}
              </StyledSplitLegendItem>
              <StyledSplitLegendItem>
                <StyledDot tone="due" />
                {i18n._(msg`Due later`)}{' '}
                {formatBilanMoney(
                  summary.dueLaterOutstandingMicros,
                  summary.currencyCode,
                  locale,
                )}
              </StyledSplitLegendItem>
              <StyledSplitLegendItem>
                <StyledDot tone="overdue" />
                {i18n._(msg`Overdue`)}{' '}
                {formatBilanMoney(
                  summary.overdueOutstandingMicros,
                  summary.currencyCode,
                  locale,
                )}
              </StyledSplitLegendItem>
            </StyledSplitLegend>
          </div>
          <StyledInvoiceList>
            {visibleInvoices.map((invoice) => {
              const title =
                invoice.clientName?.trim() ||
                invoice.number?.trim() ||
                i18n._(msg`Invoice`);
              const subtitle = [
                invoice.number,
                invoice.dueDate === null
                  ? ''
                  : formatBilanDate(invoice.dueDate, locale),
              ]
                .filter((value): value is string => Boolean(value))
                .join(' · ');

              return (
                <StyledInvoiceRow
                  key={invoice.id}
                  type="button"
                  onClick={() =>
                    openRecordInSidePanel({
                      recordId: invoice.id,
                      objectNameSingular: objectMetadataItem.nameSingular,
                    })
                  }
                  aria-label={`${title}, ${formatBilanMoney(
                    invoice.outstandingMicros,
                    summary.currencyCode,
                    locale,
                  )}${invoice.isOverdue ? `, ${i18n._(msg`Overdue`)}` : ''}`}
                >
                  <StyledInvoiceIdentity>
                    <StyledInvoiceTitle className="bilan-invoice-title">
                      {title}
                    </StyledInvoiceTitle>
                    {subtitle !== '' && (
                      <StyledInvoiceSubtitle>{subtitle}</StyledInvoiceSubtitle>
                    )}
                  </StyledInvoiceIdentity>
                  {invoice.isOverdue && (
                    <StyledOverdueFlag>
                      {i18n._(msg`Overdue`)}
                    </StyledOverdueFlag>
                  )}
                  <StyledInvoiceAmount>
                    {formatBilanMoney(
                      invoice.outstandingMicros,
                      summary.currencyCode,
                      locale,
                    )}
                  </StyledInvoiceAmount>
                </StyledInvoiceRow>
              );
            })}
          </StyledInvoiceList>
          {summary.paidThisMonthMicros > 0 && (
            <StyledFootnote>
              {i18n._(msg`Collected this month`)}{' '}
              {formatBilanMoney(
                summary.paidThisMonthMicros,
                summary.currencyCode,
                locale,
              )}
            </StyledFootnote>
          )}
        </>
      )}
    </BilanPulseCard>
  );
};
