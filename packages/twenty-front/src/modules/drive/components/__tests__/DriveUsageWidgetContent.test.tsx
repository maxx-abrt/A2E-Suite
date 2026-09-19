import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { DriveUsageWidgetContent } from '@/drive/components/DriveUsageWidgetContent';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

describe('DriveUsageWidgetContent', () => {
  it('renders the total and both breakdowns', () => {
    render(
      <DriveUsageWidgetContent
        summary={{
          totalFiles: 3,
          byCategory: [
            { key: 'TEXT_DOCUMENT', count: 2 },
            { key: 'IMAGE', count: 1 },
          ],
          bySourceApp: [{ key: 'drive', count: 2 }],
          quota: null,
        }}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('drive-usage-widget')).toHaveTextContent(
      'Total files: 3',
    );
    expect(screen.getByTestId('drive-usage-by-category')).toHaveTextContent(
      'Documents',
    );
    expect(screen.getByTestId('drive-usage-by-category')).toHaveTextContent(
      'Images',
    );
    expect(screen.getByTestId('drive-usage-by-source')).toHaveTextContent(
      'drive',
    );
    expect(screen.queryByTestId('drive-usage-quota')).toBeNull();
  });

  it('renders the quota only when billing supplies a limit', () => {
    render(
      <DriveUsageWidgetContent
        summary={{
          totalFiles: 4,
          byCategory: [],
          bySourceApp: [],
          quota: {
            limitFiles: 10,
            usedFiles: 4,
            remainingFiles: 6,
            percentUsed: 40,
          },
        }}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('drive-usage-quota')).toHaveTextContent('4 / 10');
  });

  it('shows the empty state without files', () => {
    render(
      <DriveUsageWidgetContent
        summary={{
          totalFiles: 0,
          byCategory: [],
          bySourceApp: [],
          quota: null,
        }}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('drive-usage-widget')).toHaveTextContent(
      'No files yet',
    );
  });
});
