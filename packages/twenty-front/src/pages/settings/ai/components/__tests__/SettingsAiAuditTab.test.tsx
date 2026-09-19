import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { aiModelsState } from '@/client-config/states/aiModelsState';
import { isClickHouseConfiguredState } from '@/client-config/states/isClickHouseConfiguredState';
import { useEventLogs } from '@/settings/event-logs/hooks/useQueryEventLogs';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import {
  BillingEntitlementKey,
  EventLogTable,
} from '~/generated-metadata/graphql';
import { SettingsAiAuditTab } from '~/pages/settings/ai/components/SettingsAiAuditTab';
import { AI_PROVIDER_CREDENTIAL_MASK } from '~/pages/settings/ai/utils/getAiProviderCredentialStatuses';

jest.mock('@/settings/event-logs/hooks/useQueryEventLogs', () => ({
  useEventLogs: jest.fn(),
}));

jest.mock('@/settings/event-logs/components/EventLogResultsTable', () => ({
  EventLogResultsTable: ({ records }: { records: unknown[] }) => (
    <div data-testid="event-log-results">{records.length} records</div>
  ),
}));

jest.mock('@/settings/components/SettingsEnterpriseFeatureGateCard', () => ({
  SettingsEnterpriseFeatureGateCard: ({ title }: { title: string }) => (
    <div data-testid="enterprise-gate">{title}</div>
  ),
}));

const mockedUseEventLogs = useEventLogs as jest.MockedFunction<
  typeof useEventLogs
>;

const Wrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={jotaiStore}>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </JotaiProvider>
);

const setEntitlement = (hasAuditLogsEntitlement: boolean) => {
  jotaiStore.set(
    currentWorkspaceState.atom,
    {
      id: 'workspace-1',
      billingEntitlements: [
        {
          key: BillingEntitlementKey.AUDIT_LOGS,
          value: hasAuditLogsEntitlement,
        },
      ],
    } as never,
  );
};

describe('SettingsAiAuditTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetJotaiStore();
    jotaiStore.set(aiModelsState.atom, [
      {
        modelId: 'openai/gpt-4o',
        label: 'GPT-4o',
        providerName: 'openai',
        providerLabel: 'OpenAI',
      },
      {
        modelId: 'anthropic/claude',
        label: 'Claude',
        providerName: 'anthropic',
        providerLabel: 'Anthropic',
      },
    ]);
    mockedUseEventLogs.mockReturnValue({
      records: [],
      totalCount: 0,
      hasNextPage: false,
      loading: false,
      error: undefined,
      loadMore: jest.fn(),
    });
  });

  it('renders provider keys masked and reads usage logs from the USAGE_EVENT event-log table', () => {
    setEntitlement(true);
    jotaiStore.set(isClickHouseConfiguredState.atom, true);
    mockedUseEventLogs.mockReturnValue({
      records: [
        {
          event: 'AI',
          timestamp: '2026-09-20T00:00:00.000Z',
          userId: 'user-1',
          properties: { operationType: 'AI_CHAT_TOKEN', quantity: 42 },
          recordId: null,
          objectMetadataId: null,
        },
      ],
      totalCount: 1,
      hasNextPage: false,
      loading: false,
      error: undefined,
      loadMore: jest.fn(),
    });

    render(<SettingsAiAuditTab />, { wrapper: Wrapper });

    expect(screen.getByText('OpenAI')).toBeVisible();
    expect(screen.getByText('Anthropic')).toBeVisible();
    expect(screen.getAllByText(AI_PROVIDER_CREDENTIAL_MASK)).toHaveLength(2);
    expect(screen.queryByText(/sk-/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('event-log-results')).toHaveTextContent(
      '1 records',
    );

    expect(mockedUseEventLogs).toHaveBeenCalledWith(
      expect.objectContaining({ table: EventLogTable.USAGE_EVENT }),
      { skip: false },
    );
  });

  it('gates the usage logs behind the audit-logs entitlement but still shows masked provider status', () => {
    setEntitlement(false);
    jotaiStore.set(isClickHouseConfiguredState.atom, true);

    render(<SettingsAiAuditTab />, { wrapper: Wrapper });

    expect(screen.getByTestId('enterprise-gate')).toBeVisible();
    expect(screen.getAllByText(AI_PROVIDER_CREDENTIAL_MASK)).toHaveLength(2);
    expect(mockedUseEventLogs).toHaveBeenCalledWith(expect.anything(), {
      skip: true,
    });
  });

  it('shows a ClickHouse notice when the entitlement is present but ClickHouse is not configured', () => {
    setEntitlement(true);
    jotaiStore.set(isClickHouseConfiguredState.atom, false);

    render(<SettingsAiAuditTab />, { wrapper: Wrapper });

    expect(screen.getByText('ClickHouse Not Configured')).toBeVisible();
    expect(screen.queryByTestId('event-log-results')).not.toBeInTheDocument();
  });
});
