import { HelmetProvider } from '@dr.pogodin/react-helmet';
import { PUBLIC_SITE_ROUTES } from '@/public-site/PublicSitePages';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'twenty-ui/theme-constants';
import { AppPath } from 'twenty-shared/types';

import { useIsLogged } from '@/auth/hooks/useIsLogged';
import { useIsCurrentLocationOnDefaultDomain } from '@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain';
import { PublicLandingPage } from '~/pages/auth/PublicLandingPage';

jest.mock('@/auth/hooks/useIsLogged');
jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain');

const renderLanding = (path = '/') =>
  render(
    <HelmetProvider>
      <I18nProvider i18n={i18n}>
        <ThemeProvider colorScheme="light">
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/" element={<PublicLandingPage />} />
              {PUBLIC_SITE_ROUTES.map((page) => (
                <Route
                  key={page.id}
                  path={page.path}
                  element={<PublicLandingPage />}
                />
              ))}
              <Route path={AppPath.SignInUp} element={<h1>Account entry</h1>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>
    </HelmetProvider>,
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
      screen.getAllByRole('link', { name: 'Create your workspace' })[0],
    );
    expect(
      screen.getByRole('heading', { name: 'Account entry' }),
    ).toBeVisible();
  });

  it('keeps the website navigation, application explanations and useful subpages', async () => {
    renderLanding();
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'Product overview' }));
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Less switching. More doing.',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: 'Your notes deserve a good new home.',
      }),
    ).toBeVisible();
    await user.click(screen.getAllByRole('link', { name: 'Why A2E' })[0]);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Good tools should give you space.',
      }),
    ).toBeVisible();
  });

  it('lets visitors explore the preview with pointer and keyboard', async () => {
    renderLanding();
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Projects' }));
    expect(
      screen.getByRole('tabpanel', { name: 'Projects' }),
    ).toHaveTextContent('Small steps. Real progress.');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Agenda' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Agenda' })).toHaveTextContent(
      'Weekly planning',
    );
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Syna' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Syna' })).toHaveTextContent(
      'This preview does not send a request to an AI service.',
    );
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Bureau' })).toHaveFocus();
  });

  it('opens sample notes and returns to their parent without losing task choices', async () => {
    renderLanding();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Project brief' }));
    expect(screen.getByRole('tabpanel', { name: 'Bureau' })).toHaveTextContent(
      'Our goal: create a useful team handbook.',
    );
    await user.click(screen.getByRole('button', { name: 'Meeting notes' }));
    expect(screen.getByRole('tabpanel', { name: 'Bureau' })).toHaveTextContent(
      'Weekly review · Design and planning',
    );
    await user.click(
      screen.getByRole('button', { name: 'Back to parent page' }),
    );
    expect(screen.getByRole('button', { name: 'Project brief' })).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Projects' }));
    const task = screen.getByRole('checkbox', {
      name: 'Gather the first ideas',
    });
    expect(task).not.toBeChecked();
    await user.click(task);
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      '2 of 3 steps complete',
    );
    await user.click(screen.getByRole('tab', { name: 'Archive' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Team handbook.pdf');
    await user.click(screen.getByRole('tab', { name: 'Projects' }));
    expect(
      screen.getByRole('checkbox', { name: 'Gather the first ideas' }),
    ).toBeChecked();
  });

  it('explains preset app boundaries using the real workspace starting points', async () => {
    renderLanding('/apps');
    const user = userEvent.setup();
    const preview = within(
      screen.getByRole('region', { name: 'Starting point preview' }),
    );
    expect(preview.getByText('Bureau Pages')).toBeVisible();
    expect(preview.queryByText('Bilan')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Non-profit' }));
    expect(preview.getByText('Bilan')).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'CRM' }));
    expect(preview.queryByText('Bureau Pages')).not.toBeInTheDocument();
    expect(preview.queryByText('Bilan')).not.toBeInTheDocument();
    expect(
      preview.getByText('Contacts, companies & opportunities'),
    ).toBeVisible();
    expect(preview.getByText('Agenda')).toBeVisible();
    expect(screen.getByRole('radio', { name: 'CRM' })).toBeChecked();
  });

  it('allows visitors to pause decorative motion and keeps that preference across navigation', async () => {
    renderLanding();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Pause animations' }));
    expect(
      screen.getByRole('button', { name: 'Resume animations' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('link', { name: 'Product overview' }));
    expect(
      screen.getByRole('button', { name: 'Resume animations' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Resume animations' }));
    expect(
      screen.getByRole('button', { name: 'Pause animations' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it.each(['bureau', 'agenda', 'bilan', 'archive', 'crm', 'syna'])(
    'opens the %s detail page with its own example selected',
    (applicationId) => {
      renderLanding(`/apps/${applicationId}`);
      expect(screen.getByRole('tab', { selected: true })).toHaveAttribute(
        'id',
        `preview-tab-${applicationId}`,
      );
      expect(
        within(
          screen.getByRole('navigation', { name: 'Main navigation' }),
        ).getByRole('link', { name: 'Applications', current: 'location' }),
      ).toBeVisible();
    },
  );

  it.each(PUBLIC_SITE_ROUTES.map((page) => page.path))(
    'supports direct entry to %s without an account',
    (path) => {
      renderLanding(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
      expect(screen.queryByText(/Twenty/)).not.toBeInTheDocument();
    },
  );

  it.each(['/legal/terms', '/legal/privacy', '/legal/dpa'])(
    'publishes the association identity and a contact link at %s',
    (path) => {
      renderLanding(path);
      expect(
        screen.getByText(
          'Association d’Entraide Étudiante · Association déclarée',
        ),
      ).toBeVisible();
      expect(
        screen.getByRole('link', { name: 'contact@association2e.org' }),
      ).toHaveAttribute('href', 'mailto:contact@association2e.org');
      expect(
        screen.getByText('SIREN 994 936 789 · SIRET 994 936 789 00019'),
      ).toBeVisible();
      expect(document.querySelector('a[href*="twenty.com"]')).toBeNull();
    },
  );

  it('opens accessible answers without leaving the page', async () => {
    renderLanding('/getting-started');
    const question = screen.getByText('Can I bring my Notion pages?');
    const answer = screen.getByText(/Yes. In Bureau, choose Import/);
    expect(answer).not.toBeVisible();
    await userEvent.setup().click(question);
    expect(answer).toBeVisible();
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
