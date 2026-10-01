import { ArchiveLanding } from '@/drive/components/ArchiveLanding';
import { useIsDriveApplicationInstalled } from '@/drive/hooks/useIsDriveApplicationInstalled';
import { type DriveUsageSummary } from '@/drive/utils/driveUsage';
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

jest.mock('@/drive/hooks/useIsDriveApplicationInstalled', () => ({
  useIsDriveApplicationInstalled: jest.fn(),
}));

const mockedUseIsDriveApplicationInstalled = jest.mocked(
  useIsDriveApplicationInstalled,
);

const buildUsageSummary = (totalFiles: number): DriveUsageSummary => ({
  totalFiles,
  byCategory: [],
  bySourceApp: [],
  quota: null,
});

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

describe('ArchiveLanding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseIsDriveApplicationInstalled.mockReturnValue(true);
  });

  it('renders nothing without a2e-drive', () => {
    mockedUseIsDriveApplicationInstalled.mockReturnValue(false);

    render(
      <ArchiveLanding
        onUpload={jest.fn()}
        onCreateFolder={jest.fn()}
        usageSummary={buildUsageSummary(0)}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByTestId('archive-landing')).not.toBeInTheDocument();
  });

  it('renders one primary action, a new folder action and three template links', () => {
    render(
      <ArchiveLanding
        onUpload={jest.fn()}
        onCreateFolder={jest.fn()}
        usageSummary={buildUsageSummary(0)}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('archive-landing')).toBeInTheDocument();
    expect(screen.getByTestId('archive-upload')).toBeInTheDocument();
    expect(screen.getByTestId('archive-new-folder')).toBeInTheDocument();
    expect(screen.getByTestId('archive-template-CLIENT')).toBeInTheDocument();
    expect(
      screen.getByTestId('archive-template-ASSOCIATION'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('archive-template-ADMINISTRATION_ENTREPRISE'),
    ).toBeInTheDocument();
  });

  it('shows the empty state with the single primary action when there is no file', () => {
    render(
      <ArchiveLanding
        onUpload={jest.fn()}
        onCreateFolder={jest.fn()}
        usageSummary={buildUsageSummary(0)}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByText(
        'No files yet — upload one or start from a folder structure.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('archive-landing-usage'),
    ).not.toBeInTheDocument();
  });

  it('shows the usage indicator once drive data exists', () => {
    render(
      <ArchiveLanding
        onUpload={jest.fn()}
        onCreateFolder={jest.fn()}
        usageSummary={buildUsageSummary(42)}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('archive-landing-usage')).toHaveTextContent(
      '42 files',
    );
  });

  it('uploads from the primary action', async () => {
    const user = userEvent.setup();
    const onUpload = jest.fn();

    render(
      <ArchiveLanding
        onUpload={onUpload}
        onCreateFolder={jest.fn()}
        usageSummary={buildUsageSummary(3)}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByTestId('archive-upload'));

    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('deep-links a template into the gallery preselected to its key', async () => {
    const user = userEvent.setup();

    render(
      <ArchiveLanding
        onUpload={jest.fn()}
        onCreateFolder={jest.fn()}
        usageSummary={buildUsageSummary(0)}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByTestId('archive-template-CLIENT'));

    expect(mockOpenTemplateGallery).toHaveBeenCalledWith({
      category: 'Archive',
      templateKey: 'CLIENT',
    });
  });
});
