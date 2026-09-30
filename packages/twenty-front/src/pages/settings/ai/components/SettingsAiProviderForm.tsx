import { useState } from 'react';

import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';

import { Select } from '@/ui/input/components/Select';
import { TextInput } from '@/ui/input/components/TextInput';
import { type WorkspaceAiProviderStatus } from '~/pages/settings/ai/types/WorkspaceAiProviderStatus';
import { type WorkspaceAiProviderTestResult } from '~/pages/settings/ai/types/WorkspaceAiProviderTestResult';
import { SettingsAiProviderTestFeedback } from '~/pages/settings/ai/components/SettingsAiProviderTestFeedback';

const OPEN_AI_COMPATIBLE_NPM = '@ai-sdk/openai-compatible';

const StyledFormFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

const StyledFeedbackContainer = styled.div`
  margin-top: ${themeCssVariables.spacing[3]};
`;

const StyledButtonContainer = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  margin-top: ${themeCssVariables.spacing[4]};
`;

const StyledFallbackNote = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin-top: ${themeCssVariables.spacing[3]};
`;

export type SettingsAiProviderFormValues = {
  providerName: string;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  fastModel: string;
};

type SettingsAiProviderFormProps = {
  provider: WorkspaceAiProviderStatus;
  isNewProvider: boolean;
  testResult: WorkspaceAiProviderTestResult | null;
  isTesting: boolean;
  isSaving: boolean;
  onTest: (values: SettingsAiProviderFormValues) => void;
  onSave: (values: SettingsAiProviderFormValues) => void;
  onRemove: () => void;
};

const buildModelOptions = (models: string[], currentValue: string) => {
  const values = [
    ...new Set([...models, ...(currentValue.length > 0 ? [currentValue] : [])]),
  ];

  return values.map((value) => ({ value, label: value }));
};

export const SettingsAiProviderForm = ({
  provider,
  isNewProvider,
  testResult,
  isTesting,
  isSaving,
  onTest,
  onSave,
  onRemove,
}: SettingsAiProviderFormProps) => {
  const [values, setValues] = useState<SettingsAiProviderFormValues>(() => ({
    providerName: provider.provider,
    apiKey: '',
    baseUrl: provider.baseUrl ?? '',
    defaultModel: provider.defaultModel ?? '',
    fastModel: provider.fastModel ?? '',
  }));

  const isOpenAiCompatible = provider.npm === OPEN_AI_COMPATIBLE_NPM;
  const updateValue =
    (field: keyof SettingsAiProviderFormValues) => (value: string) =>
      setValues((previousValues) => ({ ...previousValues, [field]: value }));

  return (
    <Section>
      <H2Title
        title={provider.label ?? provider.provider}
        description={
          isNewProvider
            ? t`Add an OpenAI-compatible provider: any endpoint speaking the OpenAI API.`
            : t`The workspace key overrides the instance and catalog configuration for this provider.`
        }
      />
      <StyledFormFields>
        {isNewProvider && (
          <TextInput
            label={t`Provider name`}
            value={values.providerName}
            onChange={updateValue('providerName')}
            placeholder={t`e.g. my-llm`}
            fullWidth
          />
        )}
        <TextInput
          label={t`API key`}
          type="password"
          value={values.apiKey}
          onChange={updateValue('apiKey')}
          placeholder={
            provider.hasApiKey
              ? (provider.maskedApiKey ?? '')
              : t`Paste the API key`
          }
          fullWidth
        />
        {isOpenAiCompatible && (
          <TextInput
            label={t`Base URL`}
            value={values.baseUrl}
            onChange={updateValue('baseUrl')}
            placeholder="https://api.example.com/v1"
            fullWidth
          />
        )}
        {provider.models.length > 0 ? (
          <Select
            dropdownId={`ai-provider-default-model-${provider.provider}`}
            label={t`Default model`}
            value={values.defaultModel}
            onChange={updateValue('defaultModel')}
            options={buildModelOptions(provider.models, values.defaultModel)}
            fullWidth
          />
        ) : (
          <TextInput
            label={t`Default model`}
            value={values.defaultModel}
            onChange={updateValue('defaultModel')}
            placeholder={t`e.g. gpt-4o-mini`}
            fullWidth
          />
        )}
        {provider.models.length > 0 ? (
          <Select
            dropdownId={`ai-provider-fast-model-${provider.provider}`}
            label={t`Fast model`}
            value={values.fastModel}
            onChange={updateValue('fastModel')}
            options={buildModelOptions(provider.models, values.fastModel)}
            fullWidth
          />
        ) : (
          <TextInput
            label={t`Fast model`}
            value={values.fastModel}
            onChange={updateValue('fastModel')}
            placeholder={t`e.g. gpt-4o-mini`}
            fullWidth
          />
        )}
      </StyledFormFields>
      <StyledFeedbackContainer>
        <SettingsAiProviderTestFeedback
          testResult={testResult}
          isTesting={isTesting}
        />
      </StyledFeedbackContainer>
      <StyledButtonContainer>
        <Button
          title={isTesting ? t`Testing…` : t`Test key`}
          onClick={() => onTest(values)}
          disabled={isTesting || isSaving}
        />
        <Button
          title={isSaving ? t`Saving…` : t`Save`}
          accent="blue"
          variant="primary"
          onClick={() => onSave(values)}
          disabled={isSaving}
        />
        {!isNewProvider && provider.source === 'WORKSPACE' && (
          <Button
            title={t`Remove key`}
            accent="danger"
            onClick={onRemove}
            disabled={isSaving}
          />
        )}
      </StyledButtonContainer>
      {!isNewProvider && provider.hasApiKey && (
        <StyledFallbackNote>
          <Trans>
            Removing the key falls back to the instance AI_PROVIDERS entry, then
            to the built-in catalog.
          </Trans>
        </StyledFallbackNote>
      )}
    </Section>
  );
};
