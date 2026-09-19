import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { aiModelsState } from '@/client-config/states/aiModelsState';
import { isClickHouseConfiguredState } from '@/client-config/states/isClickHouseConfiguredState';
import { SettingsBillingLabelValueItem } from '@/settings/billing/components/internal/SettingsBillingLabelValueItem';
import { SubscriptionInfoContainer } from '@/settings/billing/components/SubscriptionInfoContainer';
import { SettingsEnterpriseFeatureGateCard } from '@/settings/components/SettingsEnterpriseFeatureGateCard';
import { EventLogResultsTable } from '@/settings/event-logs/components/EventLogResultsTable';
import { useEventLogs } from '@/settings/event-logs/hooks/useQueryEventLogs';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';
import { BillingEntitlementKey, EventLogTable } from '~/generated-metadata/graphql';
import { getAiProviderCredentialStatuses } from '~/pages/settings/ai/utils/getAiProviderCredentialStatuses';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

const AI_AUDIT_LOG_PAGE_SIZE = 50;

export const SettingsAiAuditTab = () => {
  const aiModels = useAtomStateValue(aiModelsState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const isClickHouseConfigured = useAtomStateValue(isClickHouseConfiguredState);

  const hasAuditLogsEntitlement =
    currentWorkspace?.billingEntitlements?.some(
      (entitlement) =>
        entitlement.key === BillingEntitlementKey.AUDIT_LOGS &&
        entitlement.value,
    ) === true;

  const canQueryUsageLogs = isClickHouseConfigured && hasAuditLogsEntitlement;

  const { records, totalCount, hasNextPage, loading, error, loadMore } =
    useEventLogs(
      { table: EventLogTable.USAGE_EVENT, first: AI_AUDIT_LOG_PAGE_SIZE },
      { skip: !canQueryUsageLogs },
    );

  const providerStatuses = getAiProviderCredentialStatuses(aiModels);

  const renderUsageLogs = () => {
    if (
      !hasAuditLogsEntitlement ||
      isGraphqlErrorOfType(error, 'NO_ENTITLEMENT')
    ) {
      return (
        <SettingsEnterpriseFeatureGateCard
          title={t`Enterprise feature`}
          description={t`AI audit logs are available with an Enterprise key.`}
          buttonTitle={t`Activate`}
        />
      );
    }

    if (!isClickHouseConfigured) {
      return (
        <SubscriptionInfoContainer>
          <SettingsBillingLabelValueItem
            label={t`ClickHouse Not Configured`}
            value={t`AI audit logs require ClickHouse. Contact your administrator.`}
          />
        </SubscriptionInfoContainer>
      );
    }

    if (isDefined(error)) {
      return (
        <SubscriptionInfoContainer>
          <SettingsBillingLabelValueItem
            label={t`Unable to load AI logs`}
            value={t`Something went wrong while loading AI logs. Please try again.`}
          />
        </SubscriptionInfoContainer>
      );
    }

    return (
      <>
        <SubscriptionInfoContainer>
          <SettingsBillingLabelValueItem
            label={t`Recorded AI calls`}
            value={totalCount}
          />
        </SubscriptionInfoContainer>
        <EventLogResultsTable
          records={records}
          loading={loading}
          hasNextPage={hasNextPage}
          onLoadMore={loadMore}
          selectedTable={EventLogTable.USAGE_EVENT}
        />
      </>
    );
  };

  return (
    <>
      <Section>
        <H2Title
          title={t`Provider credentials`}
          description={t`Providers configured for this workspace. Keys are masked and never displayed.`}
        />
        <SubscriptionInfoContainer>
          {providerStatuses.length === 0 ? (
            <SettingsBillingLabelValueItem
              label={t`No providers configured`}
              value="—"
            />
          ) : (
            providerStatuses.map((providerStatus) => (
              <SettingsBillingLabelValueItem
                key={providerStatus.providerName}
                label={providerStatus.providerLabel}
                value={providerStatus.maskedCredential}
                tooltipText={t`${providerStatus.availableModelCount} models available`}
                tooltipId={`ai-audit-provider-${providerStatus.providerName}`}
              />
            ))
          )}
        </SubscriptionInfoContainer>
      </Section>

      <Section>
        <H2Title
          title={t`AI usage logs`}
          description={t`Every AI call recorded in your workspace, with its operation, model and credits.`}
        />
        {renderUsageLogs()}
      </Section>
    </>
  );
};
