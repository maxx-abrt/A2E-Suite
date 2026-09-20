import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { useMarketplaceApps } from '@/marketplace/hooks/useMarketplaceApps';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { InstallApps } from '~/pages/onboarding/InstallApps';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const CALL_RECORDER_UNIVERSAL_IDENTIFIER =
  '8da4b8b5-5edf-4880-b51f-ab6e679ec617';

const FAILURE_SUBTITLE =
  "We couldn't load the app catalogue. Your template choice is kept — check your connection and try again.";
const EMPTY_SUBTITLE = 'No apps are available to install right now';

jest.mock('@/marketplace/hooks/useMarketplaceApps');

jest.mock('@/onboarding/hooks/useInstallOnboardingApps', () => ({
  useInstallOnboardingApps: () => ({
    selectedUniversalIdentifiers: [],
    isCompleting: false,
    toggleApp: jest.fn(),
    installSelectedAppsAndContinue: jest.fn(),
    skip: jest.fn(),
  }),
}));

jest.mock('@/a2e-workspace/components/A2eWorkspaceTemplatePicker', () => ({
  A2eWorkspaceTemplatePicker: () => (
    <div data-testid="shared-template-picker" />
  ),
}));

const mockedUseMarketplaceApps = jest.mocked(useMarketplaceApps);

const buildMarketplaceApp = (id: string) => ({
  id,
  logoUrl: null,
  isVetted: true,
});

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

describe('InstallApps catalogue empty-state subtitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a distinct failure subtitle and keeps the template picker when the catalogue fails to load', () => {
    mockedUseMarketplaceApps.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Marketplace unavailable'),
    } as unknown as ReturnType<typeof useMarketplaceApps>);

    render(<InstallApps />, { wrapper: Wrapper });

    expect(screen.getByText(FAILURE_SUBTITLE)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_SUBTITLE)).not.toBeInTheDocument();
    expect(screen.getByTestId('shared-template-picker')).toBeInTheDocument();
  });

  it('shows the empty-state subtitle and keeps the template picker when the catalogue loads with no apps', () => {
    mockedUseMarketplaceApps.mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useMarketplaceApps>);

    render(<InstallApps />, { wrapper: Wrapper });

    expect(screen.getByText(EMPTY_SUBTITLE)).toBeInTheDocument();
    expect(screen.queryByText(FAILURE_SUBTITLE)).not.toBeInTheDocument();
    expect(screen.getByTestId('shared-template-picker')).toBeInTheDocument();
  });

  it('shows no empty-state subtitle once the catalogue loads successfully, and keeps the template picker', () => {
    mockedUseMarketplaceApps.mockReturnValue({
      data: [buildMarketplaceApp(CALL_RECORDER_UNIVERSAL_IDENTIFIER)],
      isLoading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useMarketplaceApps>);

    render(<InstallApps />, { wrapper: Wrapper });

    expect(screen.getByText('Call recorder')).toBeInTheDocument();
    expect(screen.queryByText(FAILURE_SUBTITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_SUBTITLE)).not.toBeInTheDocument();
    expect(screen.getByTestId('shared-template-picker')).toBeInTheDocument();
  });
});
