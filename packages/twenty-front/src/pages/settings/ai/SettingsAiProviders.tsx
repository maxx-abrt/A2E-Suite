import { useState } from 'react';

import { t } from '@lingui/core/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { Info } from 'twenty-ui/feedback';
import { IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { H2Title } from 'twenty-ui/typography';

import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import {
  SettingsAiProviderForm,
  type SettingsAiProviderFormValues,
} from '~/pages/settings/ai/components/SettingsAiProviderForm';
import { SettingsAiProvidersList } from '~/pages/settings/ai/components/SettingsAiProvidersList';
import { useWorkspaceAiProviders } from '~/pages/settings/ai/hooks/useWorkspaceAiProviders';
import { type WorkspaceAiProviderStatus } from '~/pages/settings/ai/types/WorkspaceAiProviderStatus';
import { type WorkspaceAiProviderTestResult } from '~/pages/settings/ai/types/WorkspaceAiProviderTestResult';

const OPEN_AI_COMPATIBLE_NPM = '@ai-sdk/openai-compatible';

const buildDraftProvider = (): WorkspaceAiProviderStatus => ({
  provider: '',
  label: null,
  npm: OPEN_AI_COMPATIBLE_NPM,
  baseUrl: null,
  hasApiKey: false,
  maskedApiKey: null,
  apiKeyConfigVariable: null,
  source: 'WORKSPACE',
  isCatalogProvider: false,
  defaultModel: null,
  fastModel: null,
  models: [],
});

export const SettingsAiProviders = () => {
  const { overview, loading, upsertProvider, removeProvider, testProvider } =
    useWorkspaceAiProviders();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const [selectedProvider, setSelectedProvider] =
    useState<WorkspaceAiProviderStatus | null>(null);
  const [isNewProvider, setIsNewProvider] = useState(false);
  const [testResult, setTestResult] =
    useState<WorkspaceAiProviderTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleConfigure = (provider: WorkspaceAiProviderStatus) => {
    setSelectedProvider(provider);
    setIsNewProvider(false);
    setTestResult(null);
  };

  const handleAddOpenAiCompatible = () => {
    setSelectedProvider(buildDraftProvider());
    setIsNewProvider(true);
    setTestResult(null);
  };

  const resolveProviderName = (values: SettingsAiProviderFormValues) =>
    isNewProvider
      ? values.providerName.trim()
      : (selectedProvider?.provider ?? '');

  const handleTest = async (values: SettingsAiProviderFormValues) => {
    if (!selectedProvider) {
      return;
    }

    setIsTesting(true);

    try {
      const result = await testProvider({
        provider: resolveProviderName(values),
        npm: selectedProvider.npm,
        apiKey: values.apiKey.length > 0 ? values.apiKey : undefined,
        baseUrl: values.baseUrl.length > 0 ? values.baseUrl : undefined,
        model: values.defaultModel,
      });

      setTestResult(result);
    } catch {
      enqueueErrorSnackBar({ message: t`Unable to test the key` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (values: SettingsAiProviderFormValues) => {
    if (!selectedProvider) {
      return;
    }

    if (isNewProvider && values.providerName.trim().length === 0) {
      enqueueErrorSnackBar({ message: t`Provider name is required` });

      return;
    }

    setIsSaving(true);

    try {
      await upsertProvider({
        provider: resolveProviderName(values),
        npm: selectedProvider.npm,
        apiKey: values.apiKey.length > 0 ? values.apiKey : undefined,
        baseUrl: values.baseUrl.length > 0 ? values.baseUrl : undefined,
        defaultModel:
          values.defaultModel.length > 0 ? values.defaultModel : undefined,
        fastModel: values.fastModel.length > 0 ? values.fastModel : undefined,
      });
      enqueueSuccessSnackBar({ message: t`Provider saved` });
      setSelectedProvider(null);
      setIsNewProvider(false);
      setTestResult(null);
    } catch {
      enqueueErrorSnackBar({ message: t`Unable to save the provider` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedProvider) {
      return;
    }

    setIsSaving(true);

    try {
      await removeProvider(selectedProvider.provider);
      enqueueSuccessSnackBar({ message: t`Key removed` });
      setSelectedProvider(null);
      setTestResult(null);
    } catch {
      enqueueErrorSnackBar({ message: t`Unable to remove the key` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsPageLayout
      title={t`AI providers`}
      links={[
        {
          children: t`Workspace`,
          href: getSettingsPath(SettingsPath.General),
        },
        { children: t`Syna`, href: getSettingsPath(SettingsPath.AI) },
        { children: t`Providers` },
      ]}
    >
      <SettingsPageContainer>
        <Section>
          <H2Title
            title={t`Resolution order`}
            description={t`For every AI request, Syna resolves the workspace key first, then the instance AI_PROVIDERS entry, then the built-in catalog.`}
          />
          <Info
            text={t`Keys added here belong to this workspace only and are never returned to the browser. Billing: the provider bills the account that owns the key, and a workspace key bypasses the instance custom-provider entitlement (D-N4); metering against workspace AI credits is still to be finalized with the cost guardrails.`}
          />
        </Section>
        <Section>
          <H2Title
            title={t`Providers`}
            description={t`Add and test a provider key, then pick the default and fast model.`}
          />
          <SettingsAiProvidersList
            providers={overview?.providers ?? []}
            isLoading={loading}
            onConfigure={handleConfigure}
          />
        </Section>
        <Section>
          <H2Title
            title={t`OpenAI-compatible endpoint`}
            description={t`Connect any self-hosted or proxy endpoint that speaks the OpenAI API.`}
          />
          <Button
            title={t`Add OpenAI-compatible provider`}
            Icon={IconPlus}
            onClick={handleAddOpenAiCompatible}
          />
        </Section>
        {selectedProvider && (
          <SettingsAiProviderForm
            key={isNewProvider ? 'new-provider' : selectedProvider.provider}
            provider={selectedProvider}
            isNewProvider={isNewProvider}
            testResult={testResult}
            isTesting={isTesting}
            isSaving={isSaving}
            onTest={handleTest}
            onSave={handleSave}
            onRemove={handleRemove}
          />
        )}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
