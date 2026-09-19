import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { DriveBulkResultNotice } from '@/drive/components/DriveBulkResultNotice';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

describe('DriveBulkResultNotice', () => {
  it('renders nothing when there is no outcome', () => {
    render(
      <DriveBulkResultNotice
        completedCount={0}
        failures={[]}
        onDismiss={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByTestId('drive-bulk-result')).toBeNull();
  });

  it('reports the completed and failed counts and lists every failure', () => {
    render(
      <DriveBulkResultNotice
        completedCount={2}
        failures={[
          {
            id: 'a',
            label: 'broken.pdf',
            reason: 'unknown',
            detail: 'network down',
          },
          { id: 'b', label: 'no-url.pdf', reason: 'download-url-missing' },
        ]}
        onDismiss={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('drive-bulk-result-summary')).toHaveTextContent(
      'Completed: 2',
    );
    expect(screen.getByTestId('drive-bulk-result-summary')).toHaveTextContent(
      'Failed: 2',
    );
    expect(screen.getByTestId('drive-bulk-failure-a')).toHaveTextContent(
      'broken.pdf',
    );
    expect(screen.getByTestId('drive-bulk-failure-b')).toHaveTextContent(
      'no-url.pdf',
    );
    expect(screen.getByTestId('drive-bulk-failures')).toHaveTextContent(
      'network down',
    );
    expect(screen.getByTestId('drive-bulk-failures')).toHaveTextContent(
      'No download link available',
    );
  });

  it('offers undo only when a handler is supplied', async () => {
    const onUndo = jest.fn();
    const onDismiss = jest.fn();

    const { rerender } = render(
      <DriveBulkResultNotice
        completedCount={1}
        failures={[]}
        onDismiss={onDismiss}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByTestId('drive-bulk-undo')).toBeNull();

    rerender(
      <Wrapper>
        <DriveBulkResultNotice
          completedCount={1}
          failures={[]}
          onUndo={onUndo}
          onDismiss={onDismiss}
        />
      </Wrapper>,
    );

    await userEvent.click(screen.getByTestId('drive-bulk-undo'));
    await userEvent.click(screen.getByTestId('drive-bulk-dismiss'));

    expect(onUndo).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });
});
