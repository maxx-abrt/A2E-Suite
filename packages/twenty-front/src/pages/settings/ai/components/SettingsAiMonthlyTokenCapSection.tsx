import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/layout';
import { H2Title } from 'twenty-ui/typography';

import { SettingsBillingLabelValueItem } from '@/settings/billing/components/internal/SettingsBillingLabelValueItem';
import { SubscriptionInfoContainer } from '@/settings/billing/components/SubscriptionInfoContainer';
import { useNumberFormat } from '@/localization/hooks/useNumberFormat';

type SettingsAiMonthlyTokenCapSectionProps = {
  capTokens: number | null | undefined;
  usedTokens: number | null | undefined;
};

// Read-only surfacing of the workspace AI token guardrail (US-130). Renders
// independently of billing/ClickHouse so the self-hosted/BYOK workspaces the
// cap exists for can see it; the detailed usage view below stays gated.
export const SettingsAiMonthlyTokenCapSection = ({
  capTokens,
  usedTokens,
}: SettingsAiMonthlyTokenCapSectionProps) => {
  const { t } = useLingui();
  const { formatNumber } = useNumberFormat();

  const hasCap = isDefined(capTokens) && capTokens > 0;

  return (
    <Section>
      <H2Title
        title={t`Monthly token cap`}
        description={t`Metered AI tokens used this calendar month against the workspace cap.`}
      />
      <SubscriptionInfoContainer>
        {hasCap ? (
          <SettingsBillingLabelValueItem
            label={t`Tokens used`}
            value={t`${formatNumber(usedTokens ?? 0)} of ${formatNumber(capTokens)}`}
            isValueInPrimaryColor
          />
        ) : (
          <SettingsBillingLabelValueItem
            label={t`Token cap`}
            value={t`No cap set`}
          />
        )}
      </SubscriptionInfoContainer>
    </Section>
  );
};
