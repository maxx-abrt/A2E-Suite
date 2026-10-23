import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'twenty-ui/theme-constants';
import { AppPath } from 'twenty-shared/types';

import { useIsLogged } from '@/auth/hooks/useIsLogged';
import { useIsCurrentLocationOnDefaultDomain } from '@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain';
import { PublicLandingPage } from '~/pages/auth/PublicLandingPage';

jest.mock('@/auth/hooks/useIsLogged');
jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain');

const renderLanding = () =>
  render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider colorScheme="light">
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<PublicLandingPage />} />
            <Route path={AppPath.SignInUp} element={<h1>Account entry</h1>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </I18nProvider>,
  );

describe('public account landing', () => {
  beforeEach(() => {
    jest.mocked(useIsLogged).mockReturnValue(false);
    jest
      .mocked(useIsCurrentLocationOnDefaultDomain)
      .mockReturnValue({ isDefaultDomain: true });
  });

  it('shows a public product page and sends workspace creation to native account entry', async () => {
    renderLanding();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'A little more space for your ideas.',
      }),
    ).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Account' })).toBeVisible();
    await userEvent.click(
      screen.getByRole('link', { name: 'Create your workspace' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Account entry' }),
    ).toBeVisible();
  });

  it('resumes signed-in accounts through native account entry', () => {
    jest.mocked(useIsLogged).mockReturnValue(true);
    renderLanding();
    expect(
      screen.getByRole('heading', { name: 'Account entry' }),
    ).toBeVisible();
  });

  it('preserves workspace-domain sign-in on dedicated workspace hosts', () => {
    jest
      .mocked(useIsCurrentLocationOnDefaultDomain)
      .mockReturnValue({ isDefaultDomain: false });
    renderLanding();
    expect(
      screen.getByRole('heading', { name: 'Account entry' }),
    ).toBeVisible();
  });
});
