import { A2eContextualEmptyState } from '@/a2e-empty-state/components/A2eContextualEmptyState';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

// Mocking the host display is the reuse assertion: if the A2E empty state ever
// forked its own shell, this stub would never render and the test would fail.
jest.mock(
  '@/object-record/record-index/components/RecordIndexEmptyStateDisplay',
  () => ({
    RecordIndexEmptyStateDisplay: ({
      title,
      buttonTitle,
      footer,
    }: {
      title: string;
      buttonTitle?: string;
      footer?: ReactNode;
    }) => (
      <div data-testid="host-record-index-empty-state-display">
        <span data-testid="host-title">{title}</span>
        <span data-testid="host-button-title">{buttonTitle}</span>
        {footer}
      </div>
    ),
  }),
);

jest.mock('@/template-gallery/hooks/useOpenTemplateGallery', () => ({
  useOpenTemplateGallery: () => ({ openTemplateGallery: jest.fn() }),
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

describe('A2eContextualEmptyState host reuse', () => {
  it('renders through the host RecordIndexEmptyStateDisplay', () => {
    render(
      <A2eContextualEmptyState
        surfaceKey="bureau"
        onPrimaryAction={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByTestId('host-record-index-empty-state-display'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('host-button-title')).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-empty-state-template-bureau'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-empty-state-learn-more-bureau'),
    ).toBeInTheDocument();
  });
});
