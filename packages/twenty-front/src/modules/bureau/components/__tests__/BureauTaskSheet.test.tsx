import { BureauTaskSheet } from '@/bureau/components/BureauTaskSheet';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { RecordTableWidgetRendererContent } from '@/page-layout/widgets/record-table/components/RecordTableWidgetRendererContent';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

jest.mock('@/object-metadata/hooks/useReadableObjectMetadataItems');
jest.mock('@/object-record/hooks/useObjectPermissionsForObject');
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue');
jest.mock(
  '@/page-layout/widgets/record-table/components/RecordTableWidgetRendererContent',
  () => ({
    RecordTableWidgetRendererContent: jest.fn(
      ({ viewId }: { viewId: string }) => <div>Native view: {viewId}</div>,
    ),
  }),
);

const mockedUseReadableObjects = jest.mocked(useReadableObjectMetadataItems);
const mockedUsePermissions = jest.mocked(useObjectPermissionsForObject);
const mockedUseViews = jest.mocked(useAtomFamilySelectorValue);
const mockedNativeTable = jest.mocked(RecordTableWidgetRendererContent);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <JotaiProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </JotaiProvider>
  </I18nProvider>
);

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

describe('BureauTaskSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseReadableObjects.mockReturnValue({
      readableObjectMetadataItems: [
        { id: 'task-object', nameSingular: 'task', readableFields: [] },
      ],
    } as unknown as ReturnType<typeof useReadableObjectMetadataItems>);
    mockedUsePermissions.mockReturnValue({
      canReadObjectRecords: true,
      canUpdateObjectRecords: true,
    } as ReturnType<typeof useObjectPermissionsForObject>);
    mockedUseViews.mockReturnValue([
      { id: 'board', name: 'Board', type: 'KANBAN', viewFields: [] },
      {
        id: 'project-sheet',
        name: 'Project tasks',
        type: 'TABLE',
        viewFields: [],
      },
      {
        id: 'index',
        name: 'All tasks',
        type: 'TABLE',
        key: 'INDEX',
        viewFields: [],
      },
    ]);
  });

  it('opens the native index and switches saved sheets through the keyboard', async () => {
    const user = userEvent.setup();
    render(<BureauTaskSheet />, { wrapper: Wrapper });

    expect(screen.getByText('Native view: index')).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Board' }),
    ).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Task view' })).toHaveFocus();
    await user.selectOptions(screen.getByRole('combobox'), 'project-sheet');

    expect(screen.getByText('Native view: project-sheet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open tasks' })).toHaveAttribute(
      'href',
      '/objects/tasks?viewId=project-sheet',
    );
  });

  it('keeps edits in the native permission-aware table pipeline', () => {
    mockedUsePermissions.mockReturnValue({
      canReadObjectRecords: true,
      canUpdateObjectRecords: false,
    } as ReturnType<typeof useObjectPermissionsForObject>);
    render(<BureauTaskSheet />, { wrapper: Wrapper });

    expect(mockedNativeTable).toHaveBeenCalledWith(
      expect.objectContaining({ isUIEditable: false }),
      undefined,
    );
  });

  it('prefers the project sheet with priority when its fields are installed', () => {
    mockedUseReadableObjects.mockReturnValue({
      readableObjectMetadataItems: [
        {
          id: 'task-object',
          nameSingular: 'task',
          readableFields: [{ id: 'priority-field', name: 'priority' }],
        },
      ],
    } as unknown as ReturnType<typeof useReadableObjectMetadataItems>);
    mockedUseViews.mockReturnValue([
      {
        id: 'index',
        name: 'All tasks',
        type: 'TABLE',
        key: 'INDEX',
        viewFields: [],
      },
      {
        id: 'project-sheet',
        name: 'Project tasks',
        type: 'TABLE',
        viewFields: [{ fieldMetadataId: 'priority-field' }],
      },
    ]);
    render(<BureauTaskSheet />, { wrapper: Wrapper });

    expect(screen.getByRole('combobox')).toHaveValue('project-sheet');
    expect(screen.getByText('Native view: project-sheet')).toBeInTheDocument();
  });

  it('falls back safely if the selected view is removed', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BureauTaskSheet />, { wrapper: Wrapper });
    await user.selectOptions(screen.getByRole('combobox'), 'project-sheet');
    mockedUseViews.mockReturnValue([
      {
        id: 'index',
        name: 'All tasks',
        type: 'TABLE',
        key: 'INDEX',
        viewFields: [],
      },
    ]);
    rerender(<BureauTaskSheet />);

    expect(screen.getByRole('combobox')).toHaveValue('index');
    expect(screen.getByText('Native view: index')).toBeInTheDocument();
  });

  it('does not mount task records when the object is not readable', () => {
    mockedUseReadableObjects.mockReturnValue({
      readableObjectMetadataItems: [],
    });
    render(<BureauTaskSheet />, { wrapper: Wrapper });

    expect(mockedNativeTable).not.toHaveBeenCalled();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('keeps a working task link when no table view exists', () => {
    mockedUseViews.mockReturnValue([]);
    render(<BureauTaskSheet />, { wrapper: Wrapper });

    expect(
      screen.getByText('Open tasks to choose or create a table view.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open tasks' })).toHaveAttribute(
      'href',
      '/objects/tasks',
    );
    expect(mockedNativeTable).not.toHaveBeenCalled();
  });

  it('drops the previous selection when workspace metadata changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BureauTaskSheet />, { wrapper: Wrapper });
    await user.selectOptions(screen.getByRole('combobox'), 'project-sheet');

    mockedUseReadableObjects.mockReturnValue({
      readableObjectMetadataItems: [
        { id: 'other-task-object', nameSingular: 'task', readableFields: [] },
      ],
    } as unknown as ReturnType<typeof useReadableObjectMetadataItems>);
    mockedUseViews.mockReturnValue([
      {
        id: 'other-index',
        name: 'Other workspace tasks',
        type: 'TABLE',
        key: 'INDEX',
        viewFields: [],
      },
    ]);
    rerender(<BureauTaskSheet />);

    expect(screen.getByText('Native view: other-index')).toBeInTheDocument();
    expect(
      screen.queryByText('Native view: project-sheet'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('other-index');
  });
});
