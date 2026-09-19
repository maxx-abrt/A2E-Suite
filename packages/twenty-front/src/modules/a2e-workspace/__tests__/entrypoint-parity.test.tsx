import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { SettingsA2eWorkspaceTemplateSection } from '@/a2e-workspace/components/SettingsA2eWorkspaceTemplateSection';
import { A2E_WORKSPACE_TEMPLATE_OPTIONS } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { InstallApps } from '~/pages/onboarding/InstallApps';

jest.mock('@/a2e-workspace/components/A2eWorkspaceTemplatePicker', () => ({
  A2eWorkspaceTemplatePicker: ({ options }: { options: unknown[] }) => (
    <div
      data-testid="shared-template-picker"
      data-option-count={options.length}
    />
  ),
}));

jest.mock('@/marketplace/hooks/useMarketplaceApps', () => ({
  useMarketplaceApps: () => ({ data: [], isLoading: false, error: undefined }),
}));

jest.mock('@/onboarding/hooks/useInstallOnboardingApps', () => ({
  useInstallOnboardingApps: () => ({
    selectedUniversalIdentifiers: [],
    isCompleting: false,
    toggleApp: jest.fn(),
    installSelectedAppsAndContinue: jest.fn(),
    skip: jest.fn(),
  }),
}));

jest.mock('~/pages/onboarding/InstallAppsContent', () => ({
  InstallAppsContent: ({ templatePicker }: { templatePicker?: ReactNode }) => (
    <div data-testid="install-apps-content">{templatePicker}</div>
  ),
}));

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

describe('workspace setup entrypoint parity', () => {
  it('Settings renders the shared template picker with the shared options', () => {
    render(<SettingsA2eWorkspaceTemplateSection />, { wrapper: Wrapper });

    expect(screen.getByTestId('shared-template-picker')).toHaveAttribute(
      'data-option-count',
      String(A2E_WORKSPACE_TEMPLATE_OPTIONS.length),
    );
  });

  it('onboarding InstallApps renders the same shared template picker', () => {
    render(<InstallApps />, { wrapper: Wrapper });

    expect(screen.getByTestId('shared-template-picker')).toHaveAttribute(
      'data-option-count',
      String(A2E_WORKSPACE_TEMPLATE_OPTIONS.length),
    );
  });
});
