import { BureauSidebarTasks } from '@/bureau/components/BureauSidebarTasks';
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
jest.mock('@/bureau/components/BureauSidebarAction', () => ({
  BureauSidebarAction: ({
    label,
    hint,
  }: {
    label: string;
    hint?: React.ReactNode;
  }) => (
    <button>
      {label}
      {hint ? <span data-testid="hint">{hint}</span> : null}
    </button>
  ),
}));

const mockedUseProgress = jest.mocked(useBureauTodayProgress);
const mockedUseReadableObjects = jest.mocked(useReadableObjectMetadataItems);

const renderSidebarTasks = () =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <BureauSidebarTasks />
      </MemoryRouter>
    </I18nProvider>,
  );

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

describe('BureauSidebarTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseReadableObjects.mockReturnValue({
      readableObjectMetadataItems: [
        { id: 'task-object', nameSingular: 'task' },
      ],
    } as unknown as ReturnType<typeof useReadableObjectMetadataItems>);
    mockedUseProgress.mockReturnValue({
      totalCount: 4,
      completedCount: 1,
      openCount: 3,
      isLoading: false,
      hasError: false,
    });
  });

  it('keeps the remaining assigned work and daily progress visible at a glance', () => {
    renderSidebarTasks();

    expect(screen.getByRole('button')).toHaveTextContent('To do');
    expect(screen.getByTestId('hint')).toHaveTextContent('3');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
  });

  it('hides the count and bar when nothing is due today', () => {
    mockedUseProgress.mockReturnValue({
      totalCount: 0,
      completedCount: 0,
      openCount: 0,
      isLoading: false,
      hasError: false,
    });
    renderSidebarTasks();

    expect(screen.getByRole('button')).toHaveTextContent('To do');
    expect(screen.queryByTestId('hint')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('waits for the aggregates before showing any count', () => {
    mockedUseProgress.mockReturnValue({
      totalCount: undefined,
      completedCount: undefined,
      openCount: undefined,
      isLoading: true,
      hasError: false,
    });
    renderSidebarTasks();

    expect(screen.queryByTestId('hint')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders nothing without readable task metadata', () => {
    mockedUseReadableObjects.mockReturnValue({
      readableObjectMetadataItems: [],
    });
    renderSidebarTasks();

    expect(mockedUseProgress).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
