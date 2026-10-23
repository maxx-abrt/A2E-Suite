import { BureauTodayProgress } from '@/bureau/components/BureauTodayProgress';
import { useBureauTodayProgress } from '@/bureau/hooks/useBureauTodayProgress';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

jest.mock('@/bureau/hooks/useBureauTodayProgress');
jest.mock('@/object-metadata/hooks/useReadableObjectMetadataItems');

const mockedUseProgress = jest.mocked(useBureauTodayProgress);
const mockedUseReadableObjects = jest.mocked(useReadableObjectMetadataItems);

const renderProgress = () =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <BureauTodayProgress />
      </MemoryRouter>
    </I18nProvider>,
  );

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

describe('BureauTodayProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseReadableObjects.mockReturnValue({
      readableObjectMetadataItems: [
        { id: 'task-object', nameSingular: 'task' },
      ],
    } as ReturnType<typeof useReadableObjectMetadataItems>);
    mockedUseProgress.mockReturnValue({
      totalCount: 10,
      completedCount: 4,
      isLoading: false,
      hasError: false,
    });
  });

  it('shows actual completion and links to the native task index', () => {
    renderProgress();

    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('4 of 10 completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open tasks' })).toHaveAttribute(
      'href',
      '/objects/tasks',
    );
  });

  it('does not report an empty day as completed', () => {
    mockedUseProgress.mockReturnValue({
      totalCount: 0,
      completedCount: 0,
      isLoading: false,
      hasError: false,
    });
    renderProgress();

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(
      screen.getByText('A little room to plan your day.'),
    ).toBeInTheDocument();
  });

  it('shows loading without an invented completion percentage', () => {
    mockedUseProgress.mockReturnValue({
      totalCount: undefined,
      completedCount: undefined,
      isLoading: true,
      hasError: false,
    });
    renderProgress();

    expect(screen.getByRole('status')).toHaveTextContent('Loading your day…');
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });

  it('shows failure without treating unavailable data as an empty day', () => {
    mockedUseProgress.mockReturnValue({
      totalCount: 10,
      completedCount: 4,
      isLoading: false,
      hasError: true,
    });
    renderProgress();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Progress is unavailable',
    );
    expect(screen.queryByText('40%')).not.toBeInTheDocument();
  });

  it('does not query progress without readable task metadata', () => {
    mockedUseReadableObjects.mockReturnValue({
      readableObjectMetadataItems: [],
    });
    renderProgress();

    expect(mockedUseProgress).not.toHaveBeenCalled();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
