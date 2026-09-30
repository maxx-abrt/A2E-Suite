import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { type ObjectPermissions } from 'twenty-shared/types';

import { RecordViewEmbedHost } from '@/blocknote-editor/components/RecordViewEmbedHost';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const mockObjectMetadataItems = jest.fn();
const mockObjectPermissions = jest.fn();
const mockUseViewById = jest.fn();

jest.mock('@/object-metadata/hooks/useFilteredObjectMetadataItems', () => ({
  useFilteredObjectMetadataItems: () => ({
    objectMetadataItems: mockObjectMetadataItems(),
  }),
}));

jest.mock('@/object-record/hooks/useObjectPermissions', () => ({
  useObjectPermissions: () => ({
    objectPermissionsByObjectMetadataId: mockObjectPermissions(),
  }),
}));

jest.mock('@/views/hooks/useViewById', () => ({
  useViewById: () => mockUseViewById(),
}));

jest.mock(
  '@/page-layout/widgets/record-table/components/RecordTableWidgetRendererContent',
  () => ({
    RecordTableWidgetRendererContent: () => <div>record view widget</div>,
  }),
);

jest.mock('@/blocknote-editor/components/RecordViewEmbedViewPicker', () => ({
  RecordViewEmbedViewPicker: () => <div>record view picker</div>,
}));

const buildPermissions = (
  canReadObjectRecords: boolean,
): Record<string, ObjectPermissions & { objectMetadataId: string }> => ({
  'task-metadata-id': {
    objectMetadataId: 'task-metadata-id',
    canReadObjectRecords,
    canUpdateObjectRecords: true,
    canSoftDeleteObjectRecords: true,
    canDestroyObjectRecords: true,
    restrictedFields: {},
    rowLevelPermissionPredicates: [],
    rowLevelPermissionPredicateGroups: [],
  },
});

const renderHost = () =>
  render(
    <RecordViewEmbedHost
      blockId="block-id"
      viewId="view-id"
      viewName="Tasks by project"
      objectMetadataId="task-metadata-id"
      onSelectView={jest.fn()}
    />,
    { wrapper: Wrapper },
  );

describe('RecordViewEmbedHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObjectMetadataItems.mockReturnValue([
      { id: 'task-metadata-id', labelSingular: 'Task' },
    ]);
    mockObjectPermissions.mockReturnValue(buildPermissions(true));
    mockUseViewById.mockReturnValue({
      view: { id: 'view-id', name: 'Tasks by project' },
    });
  });

  it('renders the live native view with its name when permitted', () => {
    renderHost();

    expect(screen.getByText('record view widget')).toBeVisible();
    expect(screen.getByText('Tasks by project')).toBeVisible();
  });

  it('renders a safe permission stub and never the view when denied', () => {
    mockObjectPermissions.mockReturnValue(buildPermissions(false));

    renderHost();

    expect(screen.queryByText('record view widget')).not.toBeInTheDocument();
    expect(
      screen.getByText('You do not have permission to view the Task object'),
    ).toBeVisible();
  });

  it('renders a safe stub when the object metadata is unavailable', () => {
    mockObjectMetadataItems.mockReturnValue([]);

    renderHost();

    expect(screen.queryByText('record view widget')).not.toBeInTheDocument();
    expect(
      screen.getByText('This embedded view is not available'),
    ).toBeVisible();
  });

  it('renders the picker when the embed is not configured', () => {
    render(
      <RecordViewEmbedHost
        blockId="block-id"
        viewId=""
        viewName=""
        objectMetadataId=""
        onSelectView={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('record view picker')).toBeVisible();
  });
});
