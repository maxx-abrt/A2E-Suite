import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, type ReactNode } from 'react';

import { useMarketplaceApps } from '@/marketplace/hooks/useMarketplaceApps';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { Provider as JotaiProvider } from 'jotai';
import { InstallApps } from '~/pages/onboarding/InstallApps';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

const mockTriggerInstallAppsOnboardingStep = jest.fn();

jest.mock('@/marketplace/hooks/useMarketplaceApps', () => ({
  useMarketplaceApps: jest.fn(),
}));

jest.mock('@/onboarding/hooks/useTriggerInstallAppsOnboardingStep', () => ({
  useTriggerInstallAppsOnboardingStep: () =>
    mockTriggerInstallAppsOnboardingStep,
}));

const mockedUseMarketplaceApps = jest.mocked(useMarketplaceApps);

const Wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    JotaiProvider,
    { store: jotaiStore },
    createElement(I18nProvider, { i18n }, children),
  );

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

describe('InstallApps start-from-scratch path', () => {
  beforeEach(() => {
    localStorage.clear();
    resetJotaiStore();
    mockTriggerInstallAppsOnboardingStep.mockReset();
    mockTriggerInstallAppsOnboardingStep.mockResolvedValue(undefined);
    mockedUseMarketplaceApps.mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useMarketplaceApps>);
  });

  it('completes the step with no app installs when the scratch path is confirmed', async () => {
    const user = userEvent.setup();

    render(<InstallApps />, { wrapper: Wrapper });

    await user.click(
      screen.getByRole('button', { name: /Start from scratch/ }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Start with an empty workspace' }),
    );

    await waitFor(() =>
      expect(mockTriggerInstallAppsOnboardingStep).toHaveBeenCalledWith({
        universalIdentifiers: [],
        isAutoSkipped: false,
      }),
    );
  });
});
