import { AgendaLanding } from '@/calendar/components/AgendaLanding';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const mockOpenTemplateGallery = jest.fn();

jest.mock('@/template-gallery/hooks/useOpenTemplateGallery', () => ({
  useOpenTemplateGallery: () => ({
    openTemplateGallery: mockOpenTemplateGallery,
  }),
}));

jest.mock('@/a2e-customize/components/A2eCustomizeAction', () => ({
  A2eCustomizeAction: () => <div data-testid="a2e-customize-stub" />,
}));

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

describe('AgendaLanding', () => {
  const onCreateEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the landing, its primary action and the three featured templates', () => {
    render(<AgendaLanding onCreateEvent={onCreateEvent} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByTestId('agenda-landing')).toBeInTheDocument();
    expect(screen.getByTestId('agenda-new-event')).toBeInTheDocument();
    expect(screen.getByTestId('a2e-customize-stub')).toBeInTheDocument();
    expect(
      screen.getByTestId('agenda-template-agenda-blocage-temps-semaine'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('agenda-template-agenda-rituels-equipe'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('agenda-template-agenda-calendrier-editorial'),
    ).toBeInTheDocument();
  });

  it('opens event creation from the primary action', async () => {
    const user = userEvent.setup();

    render(<AgendaLanding onCreateEvent={onCreateEvent} />, {
      wrapper: Wrapper,
    });

    await user.click(screen.getByTestId('agenda-new-event'));

    expect(onCreateEvent).toHaveBeenCalledTimes(1);
  });

  it('shows the M13c contextual empty state when there are no events', () => {
    render(<AgendaLanding onCreateEvent={onCreateEvent} isRecordEmpty />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByTestId('a2e-contextual-empty-state'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-empty-state-primary-agenda'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-empty-state-template-agenda'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-empty-state-learn-more-agenda'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('agenda-landing')).not.toBeInTheDocument();
  });

  it('opens event creation from the contextual empty state', async () => {
    const user = userEvent.setup();

    render(<AgendaLanding onCreateEvent={onCreateEvent} isRecordEmpty />, {
      wrapper: Wrapper,
    });

    await user.click(screen.getByTestId('a2e-empty-state-primary-agenda'));

    expect(onCreateEvent).toHaveBeenCalledTimes(1);
  });

  it('deep-links a template into the gallery preselected to the Agenda category', async () => {
    const user = userEvent.setup();

    render(<AgendaLanding onCreateEvent={onCreateEvent} />, {
      wrapper: Wrapper,
    });

    await user.click(
      screen.getByTestId('agenda-template-agenda-rituels-equipe'),
    );

    expect(mockOpenTemplateGallery).toHaveBeenCalledWith({
      category: 'Agenda',
      templateKey: 'agenda-rituels-equipe',
    });
  });
});
