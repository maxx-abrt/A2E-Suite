import { BureauLanding } from '@/bureau/components/BureauLanding';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const mockCreateNewPage = jest.fn();
const mockOpenTemplateGallery = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@/bureau/components/BureauWorkspaceShortcuts', () => ({
  BureauWorkspaceShortcuts: () => <nav aria-label="Bureau shortcuts" />,
}));

jest.mock('@/bureau/components/BureauTaskSheet', () => ({
  BureauTaskSheet: () => <section aria-label="Task sheet" />,
}));

jest.mock('@/bureau/components/BureauTodayProgress', () => ({
  BureauTodayProgress: () => <div>Due today · assigned to you</div>,
}));

jest.mock('@/quick-capture/hooks/useIsDocumentApplicationInstalled', () => ({
  useIsDocumentApplicationInstalled: jest.fn(),
}));

jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: jest.fn(),
}));

jest.mock('@/quick-capture/hooks/useCreateNewPage', () => ({
  useCreateNewPage: () => ({ createNewPage: mockCreateNewPage }),
}));

jest.mock('@/template-gallery/hooks/useOpenTemplateGallery', () => ({
  useOpenTemplateGallery: () => ({
    openTemplateGallery: mockOpenTemplateGallery,
  }),
}));

jest.mock('@/home-dashboard/components/RecentPagesWidget', () => ({
  RecentPagesWidget: () => <div data-testid="recent-pages-stub" />,
}));

jest.mock('@/a2e-customize/components/A2eCustomizeAction', () => ({
  A2eCustomizeAction: () => <div data-testid="a2e-customize-stub" />,
}));

const mockedUseIsDocumentApplicationInstalled = jest.mocked(
  useIsDocumentApplicationInstalled,
);

const mockedUseFindManyRecords = jest.mocked(useFindManyRecords);

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <JotaiProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </JotaiProvider>
  </I18nProvider>
);

describe('BureauLanding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseIsDocumentApplicationInstalled.mockReturnValue(true);
    mockedUseFindManyRecords.mockReturnValue({
      totalCount: 5,
    } as unknown as ReturnType<typeof useFindManyRecords>);
  });

  it('renders nothing without a2e-documents', () => {
    mockedUseIsDocumentApplicationInstalled.mockReturnValue(false);

    render(<BureauLanding />, { wrapper: Wrapper });

    expect(screen.queryByTestId('bureau-landing')).not.toBeInTheDocument();
  });

  it('renders one primary action and three template links when installed', () => {
    render(<BureauLanding />, { wrapper: Wrapper });

    expect(screen.getByTestId('bureau-landing')).toBeInTheDocument();
    expect(screen.getByTestId('bureau-new-page')).toBeInTheDocument();
    expect(screen.getByTestId('a2e-customize-stub')).toBeInTheDocument();
    expect(
      screen.getByTestId('bureau-template-notes-de-reunion'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('bureau-template-brief-de-projet'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('bureau-template-okr')).toBeInTheDocument();
    expect(screen.getByTestId('recent-pages-stub')).toBeInTheDocument();
  });

  it('creates a page from the primary action', async () => {
    const user = userEvent.setup();

    render(<BureauLanding />, { wrapper: Wrapper });

    await user.click(screen.getByTestId('bureau-new-page'));

    expect(mockCreateNewPage).toHaveBeenCalledTimes(1);
  });

  it('keeps tasks and daily progress visible when there are no pages', () => {
    mockedUseFindManyRecords.mockReturnValue({
      totalCount: 0,
    } as unknown as ReturnType<typeof useFindManyRecords>);

    render(<BureauLanding />, { wrapper: Wrapper });

    expect(
      screen.getByTestId('a2e-contextual-empty-state'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-empty-state-primary-bureau'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-empty-state-template-bureau'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-empty-state-learn-more-bureau'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('bureau-landing')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Task sheet' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Due today · assigned to you')).toBeInTheDocument();
    expect(screen.queryByTestId('bureau-new-page')).not.toBeInTheDocument();
  });

  it('creates a page from the contextual empty state primary action', async () => {
    const user = userEvent.setup();

    mockedUseFindManyRecords.mockReturnValue({
      totalCount: 0,
    } as unknown as ReturnType<typeof useFindManyRecords>);

    render(<BureauLanding />, { wrapper: Wrapper });

    await user.click(screen.getByTestId('a2e-empty-state-primary-bureau'));

    expect(mockCreateNewPage).toHaveBeenCalledTimes(1);
  });

  it('deep-links a template into the gallery preselected to its key', async () => {
    const user = userEvent.setup();

    render(<BureauLanding />, { wrapper: Wrapper });

    await user.click(screen.getByTestId('bureau-template-okr'));

    expect(mockOpenTemplateGallery).toHaveBeenCalledWith({
      category: 'Pages',
      templateKey: 'okr',
    });
  });

  it('keeps the task sheet available while pages load', () => {
    mockedUseFindManyRecords.mockReturnValue({
      loading: true,
    } as unknown as ReturnType<typeof useFindManyRecords>);

    render(<BureauLanding />, { wrapper: Wrapper });

    expect(screen.getByRole('status')).toHaveTextContent('Loading pages…');
    expect(
      screen.getByRole('region', { name: 'Task sheet' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('recent-pages-stub')).not.toBeInTheDocument();
  });

  it('offers a real retry after a page-query failure', async () => {
    const user = userEvent.setup();
    mockedUseFindManyRecords.mockReturnValue({
      error: new Error('Offline'),
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useFindManyRecords>);

    render(<BureauLanding />, { wrapper: Wrapper });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Could not load pages.',
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId('a2e-contextual-empty-state'),
    ).not.toBeInTheDocument();
  });
});
