import {
  currentWorkspaceState,
  type CurrentWorkspace,
} from '@/auth/states/currentWorkspaceState';
import { BureauImportModal } from '@/bureau/components/BureauImportModal';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

const mockCreateOneRecord = jest.fn();
const mockUpdateOneRecord = jest.fn();
const mockUploadAttachmentFile = jest.fn();
const mockFindPage = jest.fn();
const mockResync = jest.fn();
let mockCanCreate = true;

jest.mock('@/bureau/components/BureauModal', () => ({
  BureauModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/bureau/hooks/useBureauWorkspace', () => ({
  useBureauWorkspace: () => ({
    permissions: { canUpdateObjectRecords: mockCanCreate },
    resyncDocuments: mockResync,
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
  parseMarkdownWithBlockNote: () => [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Imported content' }],
    },
  ],
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
  await user.upload(screen.getByLabelText('Notion export file'), file);
  await screen.findByText('1 pages ready to import');
};

describe('BureauImportModal workspace and retry boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanCreate = true;
    mockCreateOneRecord.mockResolvedValue(undefined);
    mockUpdateOneRecord.mockResolvedValue(undefined);
    mockFindPage.mockResolvedValue({ data: { document: null } });
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
    expect(mockUpdateOneRecord).toHaveBeenCalledTimes(1);
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
