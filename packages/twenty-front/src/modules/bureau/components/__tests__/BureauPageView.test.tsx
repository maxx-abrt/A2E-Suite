import { BureauPageView } from '@/bureau/components/BureauPageView';
import { type BureauPageRecord } from '@/bureau/types/BureauPageRecord';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useIsRecordFieldReadOnly } from '@/object-record/read-only/hooks/useIsRecordFieldReadOnly';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

const mockUpdatePage = jest.fn();
jest.mock('@/a2e-links/components/LinkToRecordButton', () => ({
  LinkToRecordButton: ({ sourceRecordId }: { sourceRecordId: string }) => (
    <button>Link {sourceRecordId}</button>
  ),
}));
const mockSeededRecords: BureauPageRecord[] = [];
const mockUpsertRecordsInStore = jest.fn(
  ({ partialRecords }: { partialRecords: BureauPageRecord[] }) => {
    mockSeededRecords.push(...partialRecords);
  },
);

jest.mock('@/object-record/hooks/useFindOneRecord', () => ({
  useFindOneRecord: jest.fn(),
}));
jest.mock('@/object-record/read-only/hooks/useIsRecordFieldReadOnly', () => ({
  useIsRecordFieldReadOnly: jest.fn(),
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItem', () => ({
  useObjectMetadataItem: () => ({
    objectMetadataItem: {
      id: 'document-metadata',
      fields: [{ id: 'title-field', name: 'title' }],
    },
  }),
}));
jest.mock('@/object-record/record-store/hooks/useUpsertRecordsInStore', () => ({
  useUpsertRecordsInStore: () => ({
    upsertRecordsInStore: mockUpsertRecordsInStore,
  }),
}));
jest.mock('@/bureau/hooks/useBureauWorkspace', () => ({
  useBureauWorkspace: () => ({
    actions: { updatePage: mockUpdatePage },
    favoriteDocumentIds: new Set(),
    toggleFavorite: jest.fn(),
    openTrash: jest.fn(),
  }),
}));
jest.mock('@/bureau/hooks/useBureauTextInputFocus', () => ({
  useBureauTextInputFocus: () => ({
    handleFocus: jest.fn(),
    handleBlur: jest.fn(),
  }),
}));
jest.mock('@/bureau/components/BureauBreadcrumbs', () => ({
  BureauBreadcrumbs: () => <nav>Breadcrumb</nav>,
}));
jest.mock('@/bureau/components/BureauPageActionsDropdown', () => ({
  BureauPageActionsDropdown: () => <button>Page actions</button>,
}));
jest.mock('@/bureau/components/BureauPageIcon', () => ({
  BureauPageIcon: () => null,
}));
jest.mock('@/bureau/components/BureauIconPicker', () => ({
  BureauIconPicker: () => <button>Add icon</button>,
}));
jest.mock('@/bureau/components/BureauCoverPicker', () => ({
  BureauCoverPicker: () => <button>Add cover</button>,
}));
jest.mock(
  '@/object-record/record-field/ui/meta-types/input/components/RichTextFieldEditor',
  () => ({
    RichTextFieldEditor: ({
      recordId,
      isReadOnly,
    }: {
      recordId: string;
      isReadOnly: boolean;
    }) => (
      <div role="textbox" aria-label="Document body" aria-readonly={isReadOnly}>
        {
          mockSeededRecords.findLast((record) => record.id === recordId)
            ?.content?.markdown
        }
      </div>
    ),
  }),
);

const page: BureauPageRecord = {
  __typename: 'Document',
  id: 'page-1',
  title: 'Meeting notes',
  icon: null,
  parentId: null,
  position: 1,
  coverColor: null,
  coverImage: null,
  createdAt: '2026-10-22T10:00:00Z',
  updatedAt: '2026-10-22T10:00:00Z',
  deletedAt: null,
  content: { blocknote: '[]', markdown: 'Existing writing' },
  contentRevision: 'revision-1',
  isFullWidth: false,
  isSmallText: false,
  isLocked: false,
};

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <MemoryRouter>{children}</MemoryRouter>
  </I18nProvider>
);

beforeEach(() => {
  i18n.load('en', {});
  i18n.activate('en');
  jest.clearAllMocks();
  mockSeededRecords.length = 0;
  mockUpdatePage.mockResolvedValue(true);
  jest.mocked(useIsRecordFieldReadOnly).mockReturnValue(false);
  jest.mocked(useFindOneRecord).mockReturnValue({
    record: page,
    loading: false,
    error: undefined,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useFindOneRecord>);
});

describe('Bureau full-page writing', () => {
  it('loads the saved body before mounting the editor and saves the title on blur', async () => {
    const user = userEvent.setup();
    render(<BureauPageView documentId={page.id} />, { wrapper: Wrapper });
    expect(
      await screen.findByRole('textbox', { name: 'Document body' }),
    ).toHaveTextContent('Existing writing');
    const title = screen.getByRole('textbox', { name: 'Page title' });
    await user.clear(title);
    await user.type(title, 'Product brief');
    await user.tab();
    await waitFor(() =>
      expect(mockUpdatePage).toHaveBeenCalledWith('page-1', {
        title: 'Product brief',
      }),
    );
  });

  it('flushes the old title to its own page when navigating to another document', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BureauPageView documentId={page.id} />, {
      wrapper: Wrapper,
    });
    await screen.findByRole('textbox', { name: 'Document body' });
    await user.type(
      screen.getByRole('textbox', { name: 'Page title' }),
      ' updated',
    );
    const secondPage = {
      ...page,
      id: 'page-2',
      title: 'Second page',
      content: { blocknote: '[]', markdown: 'Second body' },
    };
    jest.mocked(useFindOneRecord).mockReturnValue({
      record: secondPage,
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFindOneRecord>);
    rerender(<BureauPageView documentId="page-2" />);
    expect(
      await screen.findByRole('textbox', { name: 'Document body' }),
    ).toHaveTextContent('Second body');
    expect(screen.getByRole('textbox', { name: 'Page title' })).toHaveValue(
      'Second page',
    );
    expect(mockUpdatePage).toHaveBeenCalledWith('page-1', {
      title: 'Meeting notes updated',
    });
    expect(mockUpdatePage).not.toHaveBeenCalledWith(
      'page-2',
      expect.anything(),
    );
  });

  it('protects a locked page and preserves read access', async () => {
    jest.mocked(useFindOneRecord).mockReturnValue({
      record: { ...page, isLocked: true },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFindOneRecord>);
    render(<BureauPageView documentId={page.id} />, { wrapper: Wrapper });
    expect(
      await screen.findByRole('textbox', { name: 'Document body' }),
    ).toHaveAttribute('aria-readonly', 'true');
    expect(screen.getByRole('textbox', { name: 'Page title' })).toHaveAttribute(
      'readonly',
    );
    expect(
      screen.queryByRole('button', { name: 'Add cover' }),
    ).not.toBeInTheDocument();
    expect(mockUpdatePage).not.toHaveBeenCalled();
  });

  it('offers a retry when title persistence fails', async () => {
    mockUpdatePage.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<BureauPageView documentId={page.id} />, { wrapper: Wrapper });
    await user.type(
      screen.getByRole('textbox', { name: 'Page title' }),
      ' draft',
    );
    await user.tab();
    await user.click(
      await screen.findByRole('button', { name: 'Retry saving title' }),
    );
    expect(mockUpdatePage).toHaveBeenLastCalledWith('page-1', {
      title: 'Meeting notes draft',
    });
  });
});
