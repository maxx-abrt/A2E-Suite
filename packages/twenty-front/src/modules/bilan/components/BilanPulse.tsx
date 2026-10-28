import { styled } from '@linaria/react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { IconCalendarMonth } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { BilanPulseBudgetCard } from '@/bilan/components/BilanPulseBudgetCard';
import { BilanPulseCashCard } from '@/bilan/components/BilanPulseCashCard';
import { BilanPulseFundingCard } from '@/bilan/components/BilanPulseFundingCard';
import { BilanPulseReceivablesCard } from '@/bilan/components/BilanPulseReceivablesCard';
import { BilanPulseSpendingCard } from '@/bilan/components/BilanPulseSpendingCard';
import { BILAN_METADATA_UNIVERSAL_IDENTIFIERS } from '@/bilan/constants/BilanMetadata';
import {
  formatBilanMonthLong,
  getBilanLocale,
} from '@/bilan/utils/formatBilanPulse';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
`;

const StyledSectionHeader = styled.div`
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: -0.02em;
  margin: 0;
`;

const StyledSectionSubtitle = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
  margin: ${themeCssVariables.spacing[1]} 0 0;
`;

const StyledPeriod = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  white-space: nowrap;
`;

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(12, minmax(0, 1fr));
  min-width: 0;

  & > section:nth-child(2) {
    animation-delay: 60ms;
  }

  & > section:nth-child(3) {
    animation-delay: 120ms;
  }

  & > section:nth-child(4) {
    animation-delay: 180ms;
  }

  & > section:nth-child(5) {
    animation-delay: 240ms;
  }

  @media (max-width: 600px) {
    gap: ${themeCssVariables.spacing[3]};
  }

  @media (prefers-reduced-motion: reduce) {
    & > section {
      animation-delay: 0ms;
    }
  }
`;

type BilanPulseProps = {
  catalogPath: string | null;
};

export const BilanPulse = ({ catalogPath }: BilanPulseProps) => {
  const { i18n } = useLingui();
  const locale = getBilanLocale(i18n.locale);
  const now = useMemo(() => new Date(), []);
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();
  const readableObjectIdentifiers = new Set(
    readableObjectMetadataItems.map((item) => item.universalIdentifier),
  );
  const hasBookEntries = readableObjectIdentifiers.has(
    BILAN_METADATA_UNIVERSAL_IDENTIFIERS.bookEntry,
  );
  const hasInvoices = readableObjectIdentifiers.has(
    BILAN_METADATA_UNIVERSAL_IDENTIFIERS.invoice,
  );
  const hasFinanceEntries = readableObjectIdentifiers.has(
    BILAN_METADATA_UNIVERSAL_IDENTIFIERS.financeEntry,
  );
  const hasBudgets = readableObjectIdentifiers.has(
    BILAN_METADATA_UNIVERSAL_IDENTIFIERS.budget,
  );
  const hasFunding = readableObjectIdentifiers.has(
    BILAN_METADATA_UNIVERSAL_IDENTIFIERS.savedSubvention,
  );
  const financeEntryMetadata = readableObjectMetadataItems.find(
    (item) =>
      item.universalIdentifier ===
      BILAN_METADATA_UNIVERSAL_IDENTIFIERS.financeEntry,
  );
  const transactionsPath =
    financeEntryMetadata === undefined
      ? ''
      : getAppPath(AppPath.RecordIndexPage, {
          objectNamePlural: financeEntryMetadata.namePlural,
        });
  const hasPulseSources =
    hasBookEntries || hasInvoices || hasFinanceEntries || hasBudgets;

  if (!hasPulseSources) {
    return null;
  }

  return (
    <StyledSection
      aria-label={i18n._(msg`Financial pulse`)}
      data-testid="bilan-pulse"
    >
      <StyledSectionHeader>
        <div>
          <StyledSectionTitle>
            {i18n._(msg`Financial pulse`)}
          </StyledSectionTitle>
          <StyledSectionSubtitle>
            {i18n._(msg`Live from your invoices, book and budgets.`)}
          </StyledSectionSubtitle>
        </div>
        <StyledPeriod>
          <IconCalendarMonth size={14} aria-hidden />
          {formatBilanMonthLong(now, locale)}
        </StyledPeriod>
      </StyledSectionHeader>
      <StyledGrid>
        {hasBookEntries && (
          <BilanPulseCashCard
            span={hasInvoices ? 7 : 12}
            transactionsPath={transactionsPath}
          />
        )}
        {hasInvoices && (
          <BilanPulseReceivablesCard span={hasBookEntries ? 5 : 12} />
        )}
        {hasFinanceEntries && (
          <BilanPulseSpendingCard
            span={hasBudgets ? 7 : 12}
            transactionsPath={transactionsPath}
          />
        )}
        {hasBudgets && (
          <BilanPulseBudgetCard span={hasFinanceEntries ? 5 : 12} />
        )}
        {hasFunding && <BilanPulseFundingCard catalogPath={catalogPath} />}
      </StyledGrid>
    </StyledSection>
  );
};
