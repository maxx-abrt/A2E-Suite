import {
  currentWorkspaceState,
  type CurrentWorkspace,
} from '@/auth/states/currentWorkspaceState';
import { BureauImportModal } from '@/bureau/components/BureauImportModal';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { zipSync, strToU8 } from 'fflate';
import { buildBureauTree } from '@/bureau/utils/buildBureauTree';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

const mockCreateOneRecord = jest.fn();
const mockUpdateOneRecord = jest.fn();
const mockUploadAttachmentFile = jest.fn();
const mockFindPage = jest.fn();
const mockResync = jest.fn();
let mockCanCreate = true;
let mockActiveDocumentId: string | null = null;
let mockDocuments: BureauDocument[] = [];

jest.mock('@/bureau/components/BureauModal', () => ({
  BureauModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/bureau/hooks/useBureauWorkspace', () => ({
  useBureauWorkspace: () => ({
    permissions: { canUpdateObjectRecords: mockCanCreate },
    resyncDocuments: mockResync,
    activeDocumentId: mockActiveDocumentId,
    tree: buildBureauTree(mockDocuments),
    expandPageIds: jest.fn(),
    isLoading: false,
  }),
}));
jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: mockCreateOneRecord }),
}));
jest.mock('@/object-record/hooks/useUpdateOneRecord', () => ({
  useUpdateOneRecord: () => ({ updateOneRecord: mockUpdateOneRecord }),
}));
jest.mock('@/activities/files/hooks/useUploadAttachmentFile', () => ({
  useUploadAttachmentFile: () => ({
    uploadAttachmentFile: mockUploadAttachmentFile,
  }),
}));
jest.mock('@/object-metadata/hooks/useApolloCoreClient', () => ({
  useApolloCoreClient: () => ({ query: mockFindPage }),
}));
jest.mock('@/object-record/hooks/useFindOneRecordQuery', () => ({
  useFindOneRecordQuery: () => ({ findOneRecordQuery: {} }),
}));
jest.mock('@/ui/layout/modal/hooks/useModal', () => ({
  useModal: () => ({ closeModal: jest.fn() }),
}));
jest.mock('@/blocknote-editor/import/adapters/parseHtmlWithBlockNote', () => ({
  parseHtmlWithBlockNote: () => [
    { type: 'image', props: { url: 'photo.png' } },
  ],
  importedBlocksToMarkdown: async () => 'Imported content',
  parseMarkdownWithBlockNote: () => [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Imported content' }],
    },
  ],
}));

jest.mock('@/bureau/components/BureauImportPagePreview', () => ({
  BureauImportPagePreview: ({ page }: { page: { title: string } }) => (
    <div>{page.title}</div>
  ),
}));

const renderModal = () => {
  const store = createStore();
  store.set(currentWorkspaceState.atom, {
    id: 'workspace-a',
  } as CurrentWorkspace);
  render(
    <I18nProvider i18n={i18n}>
      <JotaiProvider store={store}>
        <MemoryRouter>
          <BureauImportModal />
        </MemoryRouter>
      </JotaiProvider>
    </I18nProvider>,
  );
  return store;
};

const uploadMarkdown = async (user: ReturnType<typeof userEvent.setup>) => {
  const bytes = new TextEncoder().encode('# My imported page');
  const file = new File([bytes], 'Home.md', { type: 'text/markdown' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => bytes.buffer,
  });
  await user.upload(screen.getByLabelText('Export file'), file);
  await screen.findByText('1 pages ready to import');
};

describe('BureauImportModal workspace and retry boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadAttachmentFile.mockResolvedValue({
      attachmentAbsoluteURL: 'https://files.example/source-export',
    });
    mockCanCreate = true;
    mockActiveDocumentId = null;
    mockDocuments = [];
    mockCreateOneRecord.mockResolvedValue(undefined);
    mockUpdateOneRecord.mockResolvedValue(undefined);
    mockFindPage.mockResolvedValue({ data: { document: null } });
  });

  it('previews a dropped ZIP tree without writes, then imports beneath the open page', async () => {
    mockActiveDocumentId = 'destination';
    mockDocuments = [
      {
        id: 'destination',
        title: 'My workspace notes',
        parentId: null,
        position: 10,
      } as BureauDocument,
    ];
    const user = userEvent.setup();
    renderModal();
    const bytes = zipSync({
      'Home.md': strToU8('# Home'),
      'Home/Child.md': strToU8('# Child'),
    });
    const file = new File([new Uint8Array(bytes)], 'Workspace.zip', {
      type: 'application/zip',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => bytes.buffer,
    });
    fireEvent.drop(screen.getByLabelText('Drop export here'), {
      dataTransfer: { files: [file] },
    });
    await screen.findByText('2 pages ready to import');
    const tree = screen.getByRole('navigation', { name: 'Pages in export' });
    await user.click(within(tree).getByRole('button', { name: 'Child' }));
    expect(
      await within(
        screen.getByRole('region', { name: 'Page preview' }),
      ).findByText('Child'),
    ).toBeInTheDocument();
    expect(mockCreateOneRecord).not.toHaveBeenCalled();
    expect(mockUploadAttachmentFile).not.toHaveBeenCalled();
    await user.type(screen.getByRole('searchbox'), 'Child');
    expect(
      within(tree).queryByRole('button', { name: 'Home' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Import pages' }));
    await screen.findByText('Import complete: 2 pages.');
    expect(mockCreateOneRecord).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        parentId: 'destination',
        title: 'Home',
        position: 0,
      }),
    );
    expect(mockCreateOneRecord).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        parentId: mockCreateOneRecord.mock.calls[0][0].id,
        title: 'Child',
      }),
    );
  });

  it('offers a source choice and rejects multiple dropped exports without creating pages', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Markdown & HTML' }));
    expect(
      screen.getByText(/Folders matching a page name/),
    ).toBeInTheDocument();
    fireEvent.drop(screen.getByLabelText('Drop export here'), {
      dataTransfer: { files: [new File([], 'a.zip'), new File([], 'b.zip')] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose one export file at a time.',
    );
    expect(mockCreateOneRecord).not.toHaveBeenCalled();
  });

  it('keeps the recovery ZIP separate from an attachment with the same filename', async () => {
    const user = userEvent.setup();
    renderModal();
    const bytes = zipSync({
      'Home.md': strToU8('# Home'),
      'Workspace.zip': strToU8('Nested attachment bytes'),
    });
    const file = new File([new Uint8Array(bytes)], 'Workspace.zip', {
      type: 'application/zip',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => bytes.buffer,
    });
    fireEvent.drop(screen.getByLabelText('Drop export here'), {
      dataTransfer: { files: [file] },
    });
    await screen.findByText('1 pages ready to import');
    await user.click(screen.getByRole('button', { name: 'Import pages' }));
    await screen.findByText('Import complete: 1 pages.');
    const uploads = mockUploadAttachmentFile.mock.calls;
    expect(uploads).toHaveLength(2);
    expect(uploads[0][0].name).toBe('Workspace.zip');
    expect(uploads[1][0].name).toBe('Workspace.zip');
    expect(uploads[0][0].size).toBe(strToU8('Nested attachment bytes').length);
    expect(uploads[1][0].size).toBe(file.size);
    expect(uploads[0][2].session.attachmentId).not.toBe(
      uploads[1][2].session.attachmentId,
    );
  });

  it('offers retry when content was saved but the original export could not be attached', async () => {
    const user = userEvent.setup();
    renderModal();
    await uploadMarkdown(user);
    mockUploadAttachmentFile.mockRejectedValueOnce(
      new Error('Storage offline'),
    );
    await user.click(screen.getByRole('button', { name: 'Import pages' }));
    await screen.findByText(/Import complete: 1 pages/);
    expect(screen.getByText(/1 page\(s\) need retry/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open imported pages' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry import' }));
    await screen.findByRole('button', { name: 'Open imported pages' });
    expect(mockCreateOneRecord).toHaveBeenCalledTimes(1);
    expect(mockUploadAttachmentFile).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/page\(s\) need retry/)).not.toBeInTheDocument();
  });

  it('allows choosing a different destination before import', async () => {
    mockDocuments = [
      {
        id: 'destination',
        title: 'My workspace notes',
        parentId: null,
        position: 10,
      } as BureauDocument,
    ];
    const user = userEvent.setup();
    renderModal();
    await uploadMarkdown(user);
    await user.click(screen.getByText('Bureau root'));
    await user.click(await screen.findByText('My workspace notes'));
    await user.click(screen.getByRole('button', { name: 'Import pages' }));
    await screen.findByText('Import complete: 1 pages.');
    expect(mockCreateOneRecord).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 'destination' }),
    );
  });

  it('imports through native records with a fresh page identity in each workspace', async () => {
    const user = userEvent.setup();
    const store = renderModal();
    await uploadMarkdown(user);
    await user.click(screen.getByRole('button', { name: 'Import pages' }));
    await screen.findByText('Import complete: 1 pages.');
    const firstId = mockCreateOneRecord.mock.calls[0][0].id;
    expect(mockUpdateOneRecord).toHaveBeenCalledWith(
      expect.objectContaining({ idToUpdate: firstId }),
    );

    act(() =>
      store.set(currentWorkspaceState.atom, {
        id: 'workspace-b',
      } as CurrentWorkspace),
    );
    expect(
      screen.queryByText('Import complete: 1 pages.'),
    ).not.toBeInTheDocument();
    await uploadMarkdown(user);
    await user.click(screen.getByRole('button', { name: 'Import pages' }));
    await screen.findByText('Import complete: 1 pages.');
    expect(mockCreateOneRecord.mock.calls[1][0].id).not.toBe(firstId);
  });

  it('stops an old import after switching away and back during an in-flight create', async () => {
    let finishCreate: (() => void) | undefined;
    mockCreateOneRecord.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishCreate = resolve;
        }),
    );
    const user = userEvent.setup();
    const store = renderModal();
    await uploadMarkdown(user);
    await user.click(screen.getByRole('button', { name: 'Import pages' }));
    await waitFor(() => expect(mockCreateOneRecord).toHaveBeenCalledTimes(1));

    act(() => {
      store.set(currentWorkspaceState.atom, {
        id: 'workspace-b',
      } as CurrentWorkspace);
    });
    await act(async () => {
      store.set(currentWorkspaceState.atom, {
        id: 'workspace-a',
      } as CurrentWorkspace);
      finishCreate?.();
    });

    expect(mockUpdateOneRecord).not.toHaveBeenCalled();
    expect(mockUploadAttachmentFile).not.toHaveBeenCalled();
    expect(mockFindPage).not.toHaveBeenCalled();
    expect(
      screen.queryByText('1 pages ready to import'),
    ).not.toBeInTheDocument();
  });

  it('recovers a committed create with a lost response using only the allocated identity', async () => {
    mockCreateOneRecord.mockRejectedValueOnce(new Error('Response lost'));
    mockFindPage.mockImplementation(async () => ({
      data: { document: mockCreateOneRecord.mock.calls[0][0] },
    }));
    const user = userEvent.setup();
    renderModal();
    await uploadMarkdown(user);
    await user.click(screen.getByRole('button', { name: 'Import pages' }));
    await screen.findByText('Import complete: 1 pages.');

    expect(mockCreateOneRecord).toHaveBeenCalledTimes(1);
    expect(mockFindPage).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { objectRecordId: mockCreateOneRecord.mock.calls[0][0].id },
        fetchPolicy: 'network-only',
      }),
    );
    expect(mockUpdateOneRecord).toHaveBeenCalledTimes(2);
  });

  it('does not overwrite a mismatched record when creation fails', async () => {
    mockCreateOneRecord.mockRejectedValueOnce(new Error('Create denied'));
    mockFindPage.mockImplementation(async () => ({
      data: {
        document: {
          ...mockCreateOneRecord.mock.calls[0][0],
          title: 'Different page',
        },
      },
    }));
    const user = userEvent.setup();
    renderModal();
    await uploadMarkdown(user);
    await user.click(screen.getByRole('button', { name: 'Import pages' }));
    await screen.findByRole('alert');

    expect(mockUpdateOneRecord).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Retry import' }));
    await screen.findByText('Import complete: 1 pages.');
    expect(mockCreateOneRecord.mock.calls[1][0].id).toBe(
      mockCreateOneRecord.mock.calls[0][0].id,
    );
  });

  it('does not create records without the native document permission', async () => {
    mockCanCreate = false;
    const user = userEvent.setup();
    renderModal();
    await uploadMarkdown(user);

    expect(screen.getByRole('button', { name: 'Import pages' })).toBeDisabled();
    expect(mockCreateOneRecord).not.toHaveBeenCalled();
  });
});
