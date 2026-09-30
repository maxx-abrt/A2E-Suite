import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';
import { createElement, type ReactNode } from 'react';

import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { SettingsAiProviderForm } from '~/pages/settings/ai/components/SettingsAiProviderForm';
import { type WorkspaceAiProviderStatus } from '~/pages/settings/ai/types/WorkspaceAiProviderStatus';
import { type WorkspaceAiProviderTestResult } from '~/pages/settings/ai/types/WorkspaceAiProviderTestResult';

const Wrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={jotaiStore}>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </JotaiProvider>
);

const buildProvider = (
  overrides: Partial<WorkspaceAiProviderStatus>,
): WorkspaceAiProviderStatus => ({
  provider: 'openai',
  label: 'OpenAI',
  npm: '@ai-sdk/openai',
  baseUrl: null,
  hasApiKey: false,
  maskedApiKey: null,
  apiKeyConfigVariable: null,
  source: 'CATALOG',
  isCatalogProvider: true,
  defaultModel: null,
  fastModel: null,
  models: [],
  ...overrides,
});

type SettingsAiProviderFormProps = Parameters<typeof SettingsAiProviderForm>[0];

const buildFormProps = (
  overrides: Partial<SettingsAiProviderFormProps> = {},
): SettingsAiProviderFormProps => ({
  provider: buildProvider({}),
  isNewProvider: false,
  testResult: null,
  isTesting: false,
  isSaving: false,
  onTest: jest.fn(),
  onSave: jest.fn(),
  onRemove: jest.fn(),
  ...overrides,
});

// createElement (not a JSX spread) keeps the repo's no-prop-spreading rule green.
const formElement = (overrides?: Partial<SettingsAiProviderFormProps>) =>
  createElement(SettingsAiProviderForm, buildFormProps(overrides));

const renderForm = (overrides?: Partial<SettingsAiProviderFormProps>) =>
  render(formElement(overrides), { wrapper: Wrapper });

describe('SettingsAiProviderForm', () => {
  beforeEach(() => {
    resetJotaiStore();
  });

  it('shows the masked placeholder and keeps the API key input empty', () => {
    renderForm({
      provider: buildProvider({
        hasApiKey: true,
        maskedApiKey: '••••••••',
        source: 'WORKSPACE',
      }),
    });

    const apiKeyInput = screen.getByLabelText('API key');

    expect(apiKeyInput).toHaveValue('');
    expect(apiKeyInput).toHaveAttribute('placeholder', '••••••••');
    expect(screen.queryByText(/sk-/i)).not.toBeInTheDocument();
  });

  it('renders the testing, success and typed failure states', () => {
    const { rerender } = renderForm({ isTesting: true });

    expect(screen.getByText(/Testing key/)).toBeVisible();

    const successResult: WorkspaceAiProviderTestResult = {
      success: true,
      errorCode: null,
      message: null,
      model: 'gpt-4o-mini',
    };

    rerender(formElement({ testResult: successResult }));

    expect(
      screen.getByText(/Key is valid — the provider answered with gpt-4o-mini/),
    ).toBeVisible();

    const failureResult: WorkspaceAiProviderTestResult = {
      success: false,
      errorCode: 'INVALID_API_KEY',
      message: null,
      model: 'gpt-4o-mini',
    };

    rerender(formElement({ testResult: failureResult }));

    expect(
      screen.getByText(
        'The provider rejected this API key. Check it and try again.',
      ),
    ).toBeVisible();
  });

  it('passes the typed key and model to onTest', async () => {
    const onTest = jest.fn();

    renderForm({ onTest });

    await userEvent.type(screen.getByLabelText('API key'), 'sk-candidate');
    await userEvent.type(screen.getByLabelText('Default model'), 'gpt-4o-mini');
    await userEvent.click(screen.getByText('Test key'));

    expect(onTest).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'sk-candidate',
        defaultModel: 'gpt-4o-mini',
      }),
    );
  });

  it('shows the base URL field only for OpenAI-compatible providers', () => {
    const { rerender } = renderForm();

    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument();

    rerender(
      formElement({
        provider: buildProvider({
          provider: '',
          label: null,
          npm: '@ai-sdk/openai-compatible',
          isCatalogProvider: false,
          source: 'WORKSPACE',
        }),
        isNewProvider: true,
      }),
    );

    expect(screen.getByLabelText('Base URL')).toBeVisible();
    expect(screen.getByLabelText('Provider name')).toBeVisible();
  });
});
