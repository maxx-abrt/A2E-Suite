import { styled } from '@linaria/react';

import { t } from '@lingui/core/macro';
import { Status } from 'twenty-ui/data-display';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { SettingsListCard } from '@/settings/components/SettingsListCard';
import { type WorkspaceAiProviderStatus } from '~/pages/settings/ai/types/WorkspaceAiProviderStatus';

const StyledStatusContainer = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const getSourceLabel = (
  source: WorkspaceAiProviderStatus['source'],
): string => {
  switch (source) {
    case 'WORKSPACE':
      return t`Workspace key`;
    case 'INSTANCE':
      return t`Instance`;
    case 'CATALOG':
      return t`Catalog`;
  }
};

const getProviderDescription = (
  provider: WorkspaceAiProviderStatus,
): string => {
  const parts: string[] = [
    provider.hasApiKey
      ? (provider.maskedApiKey ?? '')
      : t`No API key configured`,
  ];

  if (provider.baseUrl) {
    parts.push(provider.baseUrl);
  }

  if (provider.defaultModel) {
    parts.push(t`Default: ${provider.defaultModel}`);
  }

  if (provider.fastModel) {
    parts.push(t`Fast: ${provider.fastModel}`);
  }

  return parts.join(' · ');
};

type SettingsAiProvidersListProps = {
  providers: WorkspaceAiProviderStatus[];
  isLoading?: boolean;
  onConfigure: (provider: WorkspaceAiProviderStatus) => void;
};

export const SettingsAiProvidersList = ({
  providers,
  isLoading,
  onConfigure,
}: SettingsAiProvidersListProps) => {
  const items = providers.map((provider) => ({
    id: provider.provider,
    provider,
  }));

  return (
    <SettingsListCard
      items={items}
      isLoading={isLoading}
      rounded
      getItemLabel={(item) => item.provider.label ?? item.provider.provider}
      getItemDescription={(item) => getProviderDescription(item.provider)}
      onRowClick={(item) => onConfigure(item.provider)}
      RowRightComponent={({ item }) => (
        <StyledStatusContainer>
          <Status
            color="gray"
            text={getSourceLabel(item.provider.source)}
            weight="medium"
          />
          <Status
            color={item.provider.hasApiKey ? 'green' : 'orange'}
            text={item.provider.hasApiKey ? t`Configured` : t`No key`}
            weight="medium"
          />
        </StyledStatusContainer>
      )}
    />
  );
};
