import { BureauTodayProgress } from '@/bureau/components/BureauTodayProgress';
import { useBureauTaskSheetPreferences } from '@/bureau/hooks/useBureauTaskSheetPreferences';
import { useBureauTodayProgress } from '@/bureau/hooks/useBureauTodayProgress';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

jest.mock('@/bureau/hooks/useBureauTaskSheetPreferences');
jest.mock('@/bureau/hooks/useBureauTodayProgress');
jest.mock('@/object-metadata/hooks/useReadableObjectMetadataItems');

const mockedUseTaskSheetPreferences = jest.mocked(
  useBureauTaskSheetPreferences,
);
const mockedUseProgress = jest.mocked(useBureauTodayProgress);
const mockedUseReadableObjects = jest.mocked(useReadableObjectMetadataItems);

const mockSetPreferences = jest.fn();

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
    mockedUseTaskSheetPreferences.mockReturnValue([
      { scope: 'mine', showCompleted: false },
      mockSetPreferences,
    ] as never);
    mockedUseReadableObjects.mockReturnValue({
      readableObjectMetadataItems: [
        { id: 'task-object', nameSingular: 'task' },
      ],
    } as unknown as ReturnType<typeof useReadableObjectMetadataItems>);
    mockedUseProgress.mockReturnValue({
      totalCount: 10,
      completedCount: 4,
      openCount: 6,
      isLoading: false,
      hasError: false,
    });
  });

  it('names the open work of the assigned day instead of a bare percentage', () => {
    renderProgress();

    expect(screen.getByText('6 open')).toBeInTheDocument();
    expect(screen.getByText('4 of 10 completed')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: "Show today's tasks" }),
    ).toBeInTheDocument();
  });

  it('focuses the task sheet on Today when activated', async () => {
    const user = userEvent.setup();
    const scrollIntoView = jest.fn();
    jest
      .spyOn(document, 'getElementById')
      .mockReturnValue({ scrollIntoView } as unknown as HTMLElement);

    try {
      renderProgress();
      await user.click(
        screen.getByRole('button', { name: "Show today's tasks" }),
      );
    } finally {
      jest.restoreAllMocks();
    }

    expect(mockSetPreferences).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSetPreferences.mock.calls[0][0]({ scope: 'all' })).toEqual({
      scope: 'today',
    });
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
    });
  });

  it('does not report an empty day as completed', () => {
    mockedUseProgress.mockReturnValue({
      totalCount: 0,
      completedCount: 0,
      openCount: 0,
      isLoading: false,
      hasError: false,
    });
    renderProgress();

    expect(screen.getByText('0 open')).toBeInTheDocument();
    expect(
      screen.getByText('A little room to plan your day.'),
    ).toBeInTheDocument();
  });

  it('shows loading without an invented completion count', () => {
    mockedUseProgress.mockReturnValue({
      totalCount: undefined,
      completedCount: undefined,
      openCount: undefined,
      isLoading: true,
      hasError: false,
    });
    renderProgress();

    expect(screen.getByRole('status')).toHaveTextContent('Loading your day…');
    expect(screen.queryByText(/open/)).not.toBeInTheDocument();
  });

  it('shows failure without treating unavailable data as an empty day', () => {
    mockedUseProgress.mockReturnValue({
      totalCount: 10,
      completedCount: 4,
      openCount: 6,
      isLoading: false,
      hasError: true,
    });
    renderProgress();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Progress is unavailable',
    );
    expect(screen.queryByText(/open/)).not.toBeInTheDocument();
  });

  it('does not render without readable task metadata', () => {
    mockedUseReadableObjects.mockReturnValue({
      readableObjectMetadataItems: [],
    });
    renderProgress();

    expect(mockedUseProgress).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
