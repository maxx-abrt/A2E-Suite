import { A2eContextualEmptyState } from '@/a2e-empty-state/components/A2eContextualEmptyState';
import {
  A2E_EMPTY_STATE_SURFACES,
  type A2eEmptyStateSurfaceKey,
} from '@/a2e-empty-state/constants/A2eEmptyStateSurfaces';
import { getA2eHelpDocUrl } from '@/a2e-help/constants/A2eHelpDocPages';
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

const SURFACE_KEYS: A2eEmptyStateSurfaceKey[] = [
  'bureau',
  'agenda',
  'documents',
  'tasks',
  'bilanInvoices',
  'bilanQuotes',
  'bilanBudgets',
  'bilanCategories',
  'archive',
  'archiveFolders',
];

describe('A2eContextualEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(SURFACE_KEYS)(
    'renders exactly the four elements for %s',
    (surfaceKey) => {
      const surface = A2E_EMPTY_STATE_SURFACES[surfaceKey];

      render(
        <A2eContextualEmptyState
          surfaceKey={surfaceKey}
          onPrimaryAction={jest.fn()}
        />,
        { wrapper: Wrapper },
      );

      // one sentence — the host title, and no second copy line
      expect(screen.getByText(i18n._(surface.sentence))).toBeInTheDocument();
      expect(
        screen.getByTestId(`a2e-empty-state-primary-${surfaceKey}`),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`a2e-empty-state-template-${surfaceKey}`),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`a2e-empty-state-learn-more-${surfaceKey}`),
      ).toBeInTheDocument();

      // the host empty-state shell is reused, not forked (the testid is
      // rendered by RecordIndexEmptyStateDisplay)
      expect(
        screen.getByTestId('a2e-contextual-empty-state'),
      ).toBeInTheDocument();
    },
  );

  it('runs the surface primary action', async () => {
    const user = userEvent.setup();
    const onPrimaryAction = jest.fn();

    render(
      <A2eContextualEmptyState
        surfaceKey="bureau"
        onPrimaryAction={onPrimaryAction}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByTestId('a2e-empty-state-primary-bureau'));

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });

  it('opens the gallery on the surface category from the template link', async () => {
    const user = userEvent.setup();

    render(
      <A2eContextualEmptyState
        surfaceKey="agenda"
        onPrimaryAction={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByTestId('a2e-empty-state-template-agenda'));

    expect(mockOpenTemplateGallery).toHaveBeenCalledWith({
      category: 'Agenda',
    });
  });

  it('points the learn-more link at the surface doc page', () => {
    render(
      <A2eContextualEmptyState
        surfaceKey="tasks"
        onPrimaryAction={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByTestId('a2e-empty-state-learn-more-tasks'),
    ).toHaveAttribute('href', getA2eHelpDocUrl('agenda'));
  });

  it.each([
    ['bilanInvoices', 'Bilan', 'bilan'],
    ['archive', 'Archive', 'archive'],
  ] as const)(
    'links %s to its own gallery category and doc page',
    async (surfaceKey, category, appKey) => {
      const user = userEvent.setup();

      render(
        <A2eContextualEmptyState
          surfaceKey={surfaceKey}
          onPrimaryAction={jest.fn()}
        />,
        { wrapper: Wrapper },
      );

      expect(
        screen.getByTestId(`a2e-empty-state-learn-more-${surfaceKey}`),
      ).toHaveAttribute('href', getA2eHelpDocUrl(appKey));

      await user.click(
        screen.getByTestId(`a2e-empty-state-template-${surfaceKey}`),
      );

      expect(mockOpenTemplateGallery).toHaveBeenCalledWith({ category });
    },
  );
});
