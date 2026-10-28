import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import { PublicSiteLanguageSelector } from '@/public-site/PublicSiteLanguageSelector';
import { messages as frenchMessages } from '~/locales/generated/fr-FR';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';
import { loadLocaleCatalog } from '~/utils/i18n/loadLocaleCatalog';

jest.mock('~/utils/i18n/loadLocaleCatalog', () => ({
  loadLocaleCatalog: jest.fn(),
}));
jest.mock('~/utils/logError', () => ({ logError: jest.fn() }));

const Location = () => {
  const location = useLocation();
  return (
    <>
      <Link to="/getting-started?locale=en#questions">Return to English</Link>
      <div aria-label="URL">
        {location.pathname}
        {location.search}
        {location.hash}
      </div>
    </>
  );
};
const renderSelector = () =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter
        initialEntries={['/getting-started?campaign=autumn#questions']}
      >
        <PublicSiteLanguageSelector />
        <Location />
      </MemoryRouter>
    </I18nProvider>,
  );

beforeEach(async () => {
  jest.clearAllMocks();
  localStorage.clear();
  jest
    .mocked(loadLocaleCatalog)
    .mockResolvedValue({ messages: frenchMessages });
  await dynamicActivate('en');
});

it('keeps the route, query and section when changing language', async () => {
  renderSelector();
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Language' }),
    'fr-FR',
  );
  expect(await screen.findByRole('combobox', { name: 'Langue' })).toHaveValue(
    'fr-FR',
  );
  expect(screen.getByLabelText('URL')).toHaveTextContent(
    '/getting-started?campaign=autumn&locale=fr-FR#questions',
  );
});

it('offers a retry after a failed translation download without saving a false preference', async () => {
  jest.mocked(loadLocaleCatalog).mockRejectedValueOnce(new Error('offline'));
  renderSelector();
  const user = userEvent.setup();
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Language' }),
    'fr-FR',
  );
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Translations could not be loaded. Please try again.',
  );
  expect(localStorage.getItem('locale')).toBeNull();
  expect(screen.getByRole('combobox')).toHaveValue('en');
  await user.selectOptions(screen.getByRole('combobox'), 'fr-FR');
  expect(await screen.findByRole('combobox', { name: 'Langue' })).toHaveValue(
    'fr-FR',
  );
  expect(screen.queryByRole('status')).toBeNull();
  expect(localStorage.getItem('locale')).toBe('fr-FR');
});

it('still switches language when browser storage is disabled', async () => {
  const setItem = jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new Error('storage unavailable');
    });
  try {
    renderSelector();
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Language' }),
      'fr-FR',
    );
    expect(await screen.findByRole('combobox', { name: 'Langue' })).toHaveValue(
      'fr-FR',
    );
    expect(document.documentElement.lang).toBe('fr-FR');
  } finally {
    setItem.mockRestore();
  }
});

it('does not apply a delayed selection after leaving the public page', async () => {
  let finishLoading = (
    _catalog: Awaited<ReturnType<typeof loadLocaleCatalog>>,
  ) => {};
  jest.mocked(loadLocaleCatalog).mockReturnValueOnce(
    new Promise((resolve) => {
      finishLoading = resolve;
    }),
  );
  const { unmount } = renderSelector();
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Language' }),
    'fr-FR',
  );
  expect(screen.getByRole('combobox')).toBeDisabled();
  unmount();
  await act(async () => {
    finishLoading({ messages: frenchMessages });
  });
  await waitFor(() => expect(i18n.locale).toBe('en'));
  expect(localStorage.getItem('locale')).toBeNull();
});

it('cancels a pending language change when browser navigation chooses another URL', async () => {
  let finishLoading = (
    _catalog: Awaited<ReturnType<typeof loadLocaleCatalog>>,
  ) => {};
  jest.mocked(loadLocaleCatalog).mockReturnValueOnce(
    new Promise((resolve) => {
      finishLoading = resolve;
    }),
  );
  renderSelector();
  const user = userEvent.setup();
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Language' }),
    'fr-FR',
  );
  await user.click(screen.getByRole('link', { name: 'Return to English' }));
  expect(screen.getByRole('combobox')).toBeEnabled();
  await act(async () => {
    finishLoading({ messages: frenchMessages });
  });
  expect(screen.getByRole('combobox')).toHaveValue('en');
  expect(screen.getByLabelText('URL')).toHaveTextContent(
    '/getting-started?locale=en#questions',
  );
  expect(localStorage.getItem('locale')).toBeNull();
});
