import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { DriveBreadcrumb } from '@/drive/components/DriveBreadcrumb';
import { type DriveFolder } from '@/drive/types/DriveRecord';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const buildFolder = (id: string, name: string): DriveFolder => ({
  id,
  name,
  icon: null,
  color: null,
  parentId: null,
  archivedAt: null,
});

describe('DriveBreadcrumb', () => {
  it('renders the root and every ancestor', () => {
    render(
      <DriveBreadcrumb
        breadcrumb={[buildFolder('a', 'Alpha'), buildFolder('b', 'Beta')]}
        rootLabel="Drive"
        onSelectFolder={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('drive-breadcrumb-root')).toHaveTextContent(
      'Drive',
    );
    expect(screen.getByTestId('drive-breadcrumb-a')).toHaveTextContent('Alpha');
    expect(screen.getByTestId('drive-breadcrumb-b')).toHaveTextContent('Beta');
  });

  it('navigates to a folder when its crumb is clicked', async () => {
    const onSelectFolder = jest.fn();

    render(
      <DriveBreadcrumb
        breadcrumb={[buildFolder('a', 'Alpha')]}
        rootLabel="Drive"
        onSelectFolder={onSelectFolder}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('drive-breadcrumb-a'));

    expect(onSelectFolder).toHaveBeenCalledWith('a');
  });

  it('navigates back to the root', async () => {
    const onSelectFolder = jest.fn();

    render(
      <DriveBreadcrumb
        breadcrumb={[buildFolder('a', 'Alpha')]}
        rootLabel="Drive"
        onSelectFolder={onSelectFolder}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('drive-breadcrumb-root'));

    expect(onSelectFolder).toHaveBeenCalledWith(null);
  });
});
