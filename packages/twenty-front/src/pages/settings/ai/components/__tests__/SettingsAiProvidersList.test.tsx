import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';

import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { SettingsAiProvidersList } from '~/pages/settings/ai/components/SettingsAiProvidersList';
import { type WorkspaceAiProviderStatus } from '~/pages/settings/ai/types/WorkspaceAiProviderStatus';

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

describe('SettingsAiProvidersList', () => {
  beforeEach(() => {
    resetJotaiStore();
  });

  it('renders a workspace key only as the fixed mask', () => {
    render(
      <SettingsAiProvidersList
        providers={[
          buildProvider({
            hasApiKey: true,
            maskedApiKey: '••••••••',
            source: 'WORKSPACE',
          }),
          buildProvider({
            provider: 'anthropic',
            label: 'Anthropic',
            npm: '@ai-sdk/anthropic',
          }),
        ]}
        onConfigure={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('••••••••')).toBeVisible();
    expect(screen.getByText('Workspace key')).toBeVisible();
    expect(screen.getByText('Configured')).toBeVisible();
    expect(screen.getByText('Catalog')).toBeVisible();
    expect(screen.getByText('No key')).toBeVisible();
    expect(screen.getByText('No API key configured')).toBeVisible();
    expect(screen.queryByText(/sk-/i)).not.toBeInTheDocument();
  });

  it('calls onConfigure with the clicked provider', async () => {
    const onConfigure = jest.fn();

    render(
      <SettingsAiProvidersList
        providers={[buildProvider({})]}
        onConfigure={onConfigure}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByText('OpenAI'));

    expect(onConfigure).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai' }),
    );
  });
});
