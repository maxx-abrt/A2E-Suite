import { SettingsAdminVersionContainer } from '@/settings/admin-panel/components/SettingsAdminVersionContainer';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'twenty-ui/theme-constants';

const mockRefetch = jest.fn();
const mockUseQuery = jest.fn();
jest.mock('@apollo/client/react', () => ({
  useQuery: (...arguments_: unknown[]) => mockUseQuery(...arguments_),
}));
jest.mock('@/settings/admin-panel/apollo/hooks/useApolloAdminClient', () => ({
  useApolloAdminClient: () => ({}),
}));

const CURRENT_REVISION = 'a'.repeat(40);
const renderVersions = (
  status = 'CURRENT',
  sourceRevision = CURRENT_REVISION,
  loading = false,
) => {
  mockUseQuery.mockReturnValue({
    loading,
    refetch: mockRefetch,
    data: {
      versionInfo: {
        currentVersion: '0.2.1',
        currentBuildId: '51.2',
        currentRevision: CURRENT_REVISION,
        latestVersion: '0.2.2',
        latestBuildId: '52.1',
        latestRevision: CURRENT_REVISION,
        sourceRevision,
        repositoryUrl: 'https://github.com/maxx-abrt/A2E-Suite',
        latestBuildUrl:
          'https://github.com/maxx-abrt/A2E-Suite/actions/runs/123',
        synchronizationStatus: status,
        checkedAt: '2026-10-27T00:00:00Z',
        builtAt: '2026-10-26T23:00:00Z',
      },
    },
  });
  return render(
    <ThemeProvider colorScheme="light">
      <I18nProvider i18n={i18n}>
        <SettingsAdminVersionContainer />
      </I18nProvider>
    </ThemeProvider>,
  );
};

describe('A2E deployment version card', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18n.load('en', {});
    i18n.activate('en');
    mockRefetch.mockResolvedValue({});
  });

  it('shows running build identity and links the successful A2E workflow', () => {
    renderVersions();
    expect(
      screen.getByRole('link', { name: '0.2.1 · Build 51.2' }),
    ).toHaveAttribute(
      'href',
      `https://github.com/maxx-abrt/A2E-Suite/commit/${CURRENT_REVISION}`,
    );
    expect(
      screen.getByRole('link', { name: '0.2.2 · Build 52.1' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/maxx-abrt/A2E-Suite/actions/runs/123',
    );
    expect(
      screen.getByText('Running the latest validated revision'),
    ).toBeVisible();
  });

  it('keeps known version details visible during background refresh', () => {
    renderVersions('CURRENT', CURRENT_REVISION, true);
    expect(
      screen.getByRole('link', { name: '0.2.1 · Build 51.2' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  });

  it.each([
    ['UPDATE_AVAILABLE', 'A validated update is available'],
    ['DIVERGED', 'Running a different branch; review before updating'],
    ['UNKNOWN', 'GitHub verification unavailable'],
    ['BUILD_MISMATCH', 'Same revision, different image build'],
  ])('explains status %s', (status, label) => {
    renderVersions(status);
    expect(screen.getByText(label)).toBeVisible();
  });

  it('distinguishes unbuilt source changes and allows refreshing the cached check', async () => {
    renderVersions('CURRENT', 'b'.repeat(40));
    expect(
      screen.getByText(
        'GitHub main contains changes that have not passed image publication yet.',
      ),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
