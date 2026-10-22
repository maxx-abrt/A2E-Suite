import { SettingsA2eSuiteSection } from '~/modules/a2e-workspace/components/SettingsA2eSuiteSection';
import { useA2eSuiteApplications } from '~/modules/a2e-workspace/hooks/useA2eSuiteApplications';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

jest.mock('~/modules/a2e-workspace/hooks/useA2eSuiteApplications');
jest.mock(
  '~/pages/settings/applications/hooks/useApplicationInstallReadiness',
  () => ({
    useApplicationInstallReadiness: () => ({
      readinessByIdentifier: new Map(),
    }),
  }),
);
jest.mock(
  '~/pages/settings/applications/components/SettingsApplicationsTable',
  () => ({ SettingsApplicationsTable: () => null }),
);
jest.mock('~/modules/a2e-workspace/components/A2eSuiteApplicationCard', () => ({
  A2eSuiteApplicationCard: () => null,
}));

describe('SettingsA2eSuiteSection', () => {
  it.each([
    {
      isLoading: false,
      hasError: false,
      message: 'A2E applications are not available on this server yet.',
    },
    {
      isLoading: true,
      hasError: false,
      message: 'Loading workspace applications…',
    },
    {
      isLoading: false,
      hasError: true,
      message: 'Applications could not be loaded.',
    },
  ])(
    'keeps application discovery visible when $message',
    ({ isLoading, hasError, message }) => {
      jest.mocked(useA2eSuiteApplications).mockReturnValue({
        installedApplications: [],
        availableApplications: [],
        isLoading,
        hasError,
      });
      i18n.load('en', {});
      i18n.activate('en');
      render(
        <I18nProvider i18n={i18n}>
          <SettingsA2eSuiteSection />
        </I18nProvider>,
      );
      expect(screen.getByText('A2E Suite')).toBeInTheDocument();
      expect(screen.getByText(message, { exact: false })).toBeInTheDocument();
    },
  );
});
